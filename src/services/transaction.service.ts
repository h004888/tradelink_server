import crypto from 'crypto';
import { Transaction, ITransaction, EscrowStep } from '../models/transaction.model';
import { Listing } from '../models/listing.model';
import { AppError } from '../utils/AppError';
import { config } from '../config';
import * as notificationService from './notification.service';
import * as walletService from './wallet.service';

const ESCROW_FLOW: EscrowStep[] = ['paymentPending', 'paymentConfirmed', 'shipping', 'delivered', 'reviewPeriod', 'released'];

/**
 * Bên có quyền đẩy giao dịch từ bước này sang bước kế tiếp.
 * Không có entry cho 'paymentPending' — bước này giờ chỉ được xác nhận tự động
 * qua webhook SePay khi nhận được tiền thật (xem confirmPaymentFromWebhook), không
 * cho phép người mua tự bấm xác nhận (tránh khai khống đã thanh toán).
 */
const ADVANCE_ACTOR: Partial<Record<EscrowStep, 'buyer' | 'seller'>> = {
  paymentConfirmed: 'seller', // Người bán xác nhận đã gửi hàng
  shipping: 'buyer',          // Người mua xác nhận đã nhận hàng
  delivered: 'buyer',         // Người mua xác nhận hoàn tất, giải ngân
};

const notifyTransaction = async (tx: ITransaction, userId: string, title: string, body: string, action: string) => {
  await notificationService.create({
    userId,
    type: 'transaction',
    title,
    body,
    entityType: 'transaction',
    entityId: tx._id.toString(),
    action,
    deeplink: `/transactions/${tx.type === 'trade' ? 'trade' : 'sale'}/${tx._id.toString()}`,
    relatedId: tx._id.toString(),
  } as any).catch((err) => console.error('Transaction notification failed:', err));
};

/** Mã đối soát gắn vào nội dung chuyển khoản để webhook SePay khớp đúng giao dịch. */
export const generatePaymentCode = (): string => {
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 ký tự hex
  return `DH${rand}`;
};

export const findByUser = async (userId: string, role?: string) => {
  const query: any = {};
  if (role === 'buyer') query.buyerId = userId;
  else if (role === 'seller') query.sellerId = userId;
  else query.$or = [{ buyerId: userId }, { sellerId: userId }];
  return Transaction.find(query).sort({ createdAt: -1 });
};

export const findById = async (id: string): Promise<ITransaction> => {
  const tx = await Transaction.findById(id);
  if (!tx) throw new AppError('Không tìm thấy giao dịch', 404);
  return tx;
};

export const create = async (data: { listingId: string; buyerId: string; buyerName: string; amount?: number }): Promise<ITransaction> => {
  const listing = await Listing.findById(data.listingId);
  if (!listing) throw new AppError('Không tìm thấy tin đăng', 404);
  if (listing.status !== 'active') throw new AppError('Tin đăng không khả dụng', 400);

  const type = listing.type === 'trade' ? 'trade' : 'sale';
  const tx = await Transaction.create({
    type,
    listingId: listing._id,
    listingTitle: listing.title,
    buyerId: data.buyerId,
    buyerName: data.buyerName,
    sellerId: listing.sellerId,
    sellerName: listing.sellerName,
    amount: data.amount || listing.price,
    escrowStep: type === 'sale' ? 'paymentPending' : undefined,
    paymentCode: type === 'sale' ? generatePaymentCode() : undefined,
  });

  // Cập nhật trạng thái listing
  listing.status = type === 'sale' ? 'sold' : 'hidden';
  await listing.save();

  // F1: Auto notification cho seller
  await notificationService.create({
    userId: listing.sellerId.toString(),
    type: 'transaction',
    title: 'Đơn hàng mới',
    body: `Bạn có đơn hàng mới cho "${listing.title}"`,
    entityType: 'transaction',
    entityId: tx._id.toString(),
    action: 'transaction.created',
    deeplink: `/transactions/${tx.type === 'trade' ? 'trade' : 'sale'}/${tx._id.toString()}`,
    relatedId: tx._id.toString(),
  } as any).catch((err) => {
    // Notification failure không nên block transaction
    console.error('Notification failed:', err);
  });

  return tx;
};

export const advanceEscrow = async (id: string, userId: string): Promise<ITransaction> => {
  const tx = await Transaction.findById(id);
  if (!tx || tx.type !== 'sale') throw new AppError('Giao dịch không hợp lệ', 400);
  if (!tx.escrowStep) throw new AppError('Trạng thái escrow không hợp lệ', 400);

  // Authorization check: chỉ buyer hoặc seller của tx mới được advance
  const userIdStr = userId.toString();
  const isBuyer = tx.buyerId.toString() === userIdStr;
  const isSeller = tx.sellerId.toString() === userIdStr;
  if (!isBuyer && !isSeller) {
    throw new AppError('Bạn không có quyền thao tác giao dịch này', 403);
  }

  const currentIdx = ESCROW_FLOW.indexOf(tx.escrowStep);
  if (currentIdx === -1 || currentIdx === ESCROW_FLOW.length - 1) {
    throw new AppError('Giao dịch đã hoàn tất', 400);
  }

  const requiredActor = ADVANCE_ACTOR[tx.escrowStep];
  if (requiredActor === 'buyer' && !isBuyer) {
    throw new AppError('Chỉ người mua mới xác nhận được bước này', 403);
  }
  if (requiredActor === 'seller' && !isSeller) {
    throw new AppError('Chỉ người bán mới xác nhận được bước này', 403);
  }

  const nextStep = ESCROW_FLOW[currentIdx + 1];
  tx.escrowStep = nextStep;
  await tx.save();

  // "Thời gian đánh giá" không có hành động thủ công riêng — tự động giải ngân ngay
  // sau khi người mua xác nhận hoàn tất (không có cơ chế đếm giờ review thực sự).
  if (nextStep === 'reviewPeriod') {
    tx.escrowStep = 'released';
    await tx.save();
  }

  // Cộng tiền vào ví seller ngay khi escrow hoàn tất (released) — seller tự chủ động
  // rút tiền về ngân hàng qua Ví, thay vì admin chủ động chuyển khoản theo từng đơn.
  if (tx.escrowStep === 'released') {
    await walletService.creditForSale(tx);
    tx.walletCredited = true;
    await tx.save();
  }

  if (nextStep === 'shipping') {
    await notifyTransaction(tx, tx.buyerId.toString(), 'Người bán đã gửi hàng', `Giao dịch "${tx.listingTitle}" cần người mua xác nhận nhận hàng.`, 'transaction.shippingRequired');
  } else if (nextStep === 'delivered') {
    await notifyTransaction(tx, tx.sellerId.toString(), 'Người mua đã nhận hàng', `Giao dịch "${tx.listingTitle}" đã được người mua xác nhận nhận hàng.`, 'transaction.deliveryConfirmed');
  }
  if (tx.escrowStep === 'released') {
    await notifyTransaction(tx, tx.sellerId.toString(), 'Giao dịch đã hoàn tất', `Giao dịch "${tx.listingTitle}" đã được giải ngân.`, 'transaction.released');
  }

  return tx;
};

export const confirmTrade = async (id: string, userId: string, party: 'A' | 'B', sent: boolean, received: boolean): Promise<ITransaction> => {
  const tx = await Transaction.findById(id);
  if (!tx || tx.type !== 'trade') throw new AppError('Giao dịch không hợp lệ', 400);

  // Giao dịch đã hoàn tất (cả 2 bên đã xác nhận nhận đồ) — không cho sửa lại trạng thái nữa.
  if (tx.partyAReceived === true && tx.partyBReceived === true) {
    throw new AppError('Giao dịch đã hoàn tất', 400);
  }

  // Authorization check: userId phải là buyer (party A) hoặc seller (party B)
  const userIdStr = userId.toString();
  const isBuyer = tx.buyerId.toString() === userIdStr;
  const isSeller = tx.sellerId.toString() === userIdStr;
  if (!isBuyer && !isSeller) {
    throw new AppError('Bạn không có quyền thao tác giao dịch này', 403);
  }

  // party phải đúng vai trò — buyer gửi là party A, seller gửi là party B
  if ((party === 'A' && !isBuyer) || (party === 'B' && !isSeller)) {
    throw new AppError('Vai trò không khớp với bên giao dịch', 403);
  }

  if (party === 'A') {
    tx.partyASent = sent;
    tx.partyAReceived = received;
  } else {
    tx.partyBSent = sent;
    tx.partyBReceived = received;
  }

  await tx.save();
  const otherUserId = isBuyer ? tx.sellerId.toString() : tx.buyerId.toString();
  await notifyTransaction(tx, otherUserId, 'Giao dịch trao đổi được cập nhật', `Giao dịch "${tx.listingTitle}" vừa được cập nhật.`, 'transaction.tradeUpdated');
  if (tx.partyAReceived === true && tx.partyBReceived === true) {
    await notifyTransaction(tx, tx.buyerId.toString(), 'Giao dịch trao đổi hoàn tất', `Giao dịch "${tx.listingTitle}" đã hoàn tất.`, 'transaction.tradeCompleted');
    await notifyTransaction(tx, tx.sellerId.toString(), 'Giao dịch trao đổi hoàn tất', `Giao dịch "${tx.listingTitle}" đã hoàn tất.`, 'transaction.tradeCompleted');
  }
  return tx;
};

export const findAll = async () => {
  return Transaction.find().sort({ createdAt: -1 }).populate('buyerId', 'fullName phone').populate('sellerId', 'fullName phone');
};

/**
 * Thông tin QR chuyển khoản cho bước 'paymentPending' — dùng ảnh VietQR động,
 * không cần tự vẽ QR. SePay dò tài khoản nhận theo BIN + số tài khoản trong config.
 */
export const getPaymentInfo = async (id: string, userId: string) => {
  const tx = await Transaction.findById(id);
  if (!tx) throw new AppError('Không tìm thấy giao dịch', 404);
  if (tx.type !== 'sale' || tx.escrowStep !== 'paymentPending') {
    throw new AppError('Giao dịch này không cần thanh toán', 400);
  }
  const userIdStr = userId.toString();
  if (tx.buyerId.toString() !== userIdStr && tx.sellerId.toString() !== userIdStr) {
    throw new AppError('Bạn không có quyền xem giao dịch này', 403);
  }
  if (!config.sepay.bankBin || !config.sepay.accountNumber) {
    throw new AppError('Hệ thống chưa cấu hình cổng thanh toán SePay', 503);
  }

  // Nếu ngân hàng chỉ hỗ trợ VA, tiền phải chuyển vào số VA — chuyển vào tài khoản chính
  // sẽ không được SePay ghi nhận. Ưu tiên VA nếu có cấu hình, fallback về tài khoản chính.
  const receivingAccount = config.sepay.vaNumber || config.sepay.accountNumber;

  const addInfo = encodeURIComponent(tx.paymentCode || '');
  const accountName = encodeURIComponent(config.sepay.accountName || '');
  const qrUrl = `https://img.vietqr.io/image/${config.sepay.bankBin}-${receivingAccount}-compact2.png`
    + `?amount=${Math.round(tx.amount || 0)}&addInfo=${addInfo}&accountName=${accountName}`;

  return {
    qrUrl,
    paymentCode: tx.paymentCode,
    amount: tx.amount,
    bankAccountNumber: receivingAccount,
    bankAccountName: config.sepay.accountName,
  };
};

/**
 * Được gọi từ webhook SePay khi phát hiện có tiền vào khớp với 1 mã đối soát.
 * Idempotent: nếu giao dịch không còn ở 'paymentPending' (đã xử lý trước đó, SePay
 * gọi lại webhook do retry) thì bỏ qua êm, không báo lỗi.
 */
export const confirmPaymentFromWebhook = async (
  paymentCode: string,
  transferAmount: number,
  referenceCode: string
): Promise<ITransaction | null> => {
  const tx = await Transaction.findOne({ paymentCode, type: 'sale' });
  if (!tx) return null;
  if (tx.escrowStep !== 'paymentPending') return tx; // đã xử lý — idempotent no-op

  if ((tx.amount || 0) > transferAmount) {
    // Chuyển thiếu tiền — không tự xác nhận, để admin/seller xử lý thủ công qua khiếu nại.
    console.warn(`[SePay] Payment code ${paymentCode}: chuyển thiếu (nhận ${transferAmount}, cần ${tx.amount})`);
    return tx;
  }

  tx.escrowStep = 'paymentConfirmed';
  tx.sepayReferenceCode = referenceCode;
  await tx.save();

  for (const [userId, title] of [
    [tx.buyerId.toString(), 'Thanh toán thành công'],
    [tx.sellerId.toString(), 'Người mua đã thanh toán'],
  ] as const) {
    await notificationService.create({
      userId,
      type: 'transaction',
      title,
      body: `Giao dịch "${tx.listingTitle}" đã được xác nhận thanh toán qua SePay.`,
      entityType: 'transaction',
      entityId: tx._id.toString(),
      action: 'transaction.paymentConfirmed',
      deeplink: `/transactions/${tx.type === 'trade' ? 'trade' : 'sale'}/${tx._id.toString()}`,
      relatedId: tx._id.toString(),
    } as any).catch((err) => console.error('SePay notification failed:', err));
  }

  return tx;
};

const PAYMENT_CODE_REGEX = /DH[0-9A-F]{8}/;

/**
 * Phương án dự phòng cho webhook: chủ động gọi API SePay lấy giao dịch gần đây của tài khoản
 * nhận thanh toán (VA hoặc tài khoản chính), đối chiếu nội dung với các giao dịch đang chờ
 * thanh toán trong DB. Cần thiết vì một số tài khoản VA không kích hoạt webhook dù SePay
 * vẫn ghi nhận giao dịch phía họ (xem my.sepay.vn → Giao dịch).
 */
export const pollSepayTransactions = async (): Promise<void> => {
  if (!config.sepay.apiKey) return;

  const pendingTxs = await Transaction.find({ type: 'sale', escrowStep: 'paymentPending', paymentCode: { $exists: true } });
  if (pendingTxs.length === 0) return;

  const receivingAccount = config.sepay.vaNumber || config.sepay.accountNumber;
  const todayStr = new Date().toISOString().slice(0, 10);
  const url = `https://my.sepay.vn/userapi/transactions/list?account_number=${encodeURIComponent(receivingAccount)}&transaction_date_min=${todayStr}&limit=200`;

  let json: any;
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${config.sepay.apiKey}` } });
    if (!res.ok) {
      console.warn(`[SePay poll] API trả về lỗi HTTP ${res.status} — kiểm tra lại SEPAY_API_KEY`);
      return;
    }
    json = await res.json();
  } catch (err) {
    console.error('[SePay poll] Lỗi gọi API SePay:', err);
    return;
  }

  const transactions: any[] = json?.transactions || [];
  if (transactions.length === 0) return;

  const pendingByCode = new Map(pendingTxs.map((tx) => [tx.paymentCode, tx]));

  for (const t of transactions) {
    const content = String(t.transaction_content || '').toUpperCase().replace(/\s+/g, '');
    const match = content.match(PAYMENT_CODE_REGEX);
    if (!match || !pendingByCode.has(match[0])) continue;

    const transferAmount = Number(t.amount_in || 0);
    if (transferAmount <= 0) continue;

    await confirmPaymentFromWebhook(match[0], transferAmount, String(t.reference_number || t.id || ''));
    pendingByCode.delete(match[0]);
  }
};
