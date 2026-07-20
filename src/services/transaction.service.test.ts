jest.mock('../models/transaction.model', () => ({
  Transaction: {
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
  },
}));

jest.mock('../models/listing.model', () => ({
  Listing: {
    findById: jest.fn(),
  },
}));

jest.mock('./notification.service', () => ({
  create: jest.fn(),
}));

jest.mock('./wallet.service', () => ({
  creditForSale: jest.fn(),
}));

import { Listing } from '../models/listing.model';
import { Transaction } from '../models/transaction.model';
import * as notificationService from './notification.service';
import { advanceEscrow, confirmPaymentFromWebhook, confirmTrade, create } from './transaction.service';

const id = (value: string) => ({ toString: () => value });

const txBase = (overrides: Record<string, unknown> = {}) => ({
  _id: id('tx1'),
  type: 'sale',
  listingId: id('listing1'),
  listingTitle: 'Máy ảnh',
  buyerId: id('buyer1'),
  buyerName: 'Buyer',
  sellerId: id('seller1'),
  sellerName: 'Seller',
  amount: 100000,
  escrowStep: 'paymentPending',
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('transaction.service notification contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (notificationService.create as jest.Mock).mockResolvedValue({ _id: 'n1' });
  });

  it('creates seller notification with transaction contract', async () => {
    (Listing.findById as jest.Mock).mockResolvedValue({
      _id: id('listing1'),
      title: 'Máy ảnh',
      type: 'sale',
      status: 'active',
      sellerId: id('seller1'),
      sellerName: 'Seller',
      price: 100000,
      save: jest.fn().mockResolvedValue(undefined),
    });
    (Transaction.create as jest.Mock).mockResolvedValue(txBase());

    await create({ listingId: 'listing1', buyerId: 'buyer1', buyerName: 'Bình' });

    expect(notificationService.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'seller1',
      type: 'transaction',
      entityType: 'transaction',
      entityId: 'tx1',
      action: 'transaction.created',
      deeplink: '/transactions/tx1',
      relatedId: 'tx1',
    }));
  });

  it('confirms webhook payment with contract and keeps idempotent no-op', async () => {
    const pending = txBase({ escrowStep: 'paymentPending' });
    const processed = txBase({ escrowStep: 'paymentConfirmed' });
    (Transaction.findOne as jest.Mock)
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce(processed);

    await confirmPaymentFromWebhook('PAY1', 100000, 'REF1');
    await confirmPaymentFromWebhook('PAY1', 100000, 'REF1');

    expect(notificationService.create).toHaveBeenCalledTimes(2);
    expect(notificationService.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      userId: 'buyer1',
      entityType: 'transaction',
      entityId: 'tx1',
      action: 'transaction.paymentConfirmed',
      deeplink: '/transactions/tx1',
    }));
    expect(notificationService.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      userId: 'seller1',
      entityType: 'transaction',
      entityId: 'tx1',
      action: 'transaction.paymentConfirmed',
      deeplink: '/transactions/tx1',
    }));
  });

  it('notifies counterpart for sale escrow progress', async () => {
    (Transaction.findById as jest.Mock)
      .mockResolvedValueOnce(txBase({ escrowStep: 'paymentConfirmed' }))
      .mockResolvedValueOnce(txBase({ escrowStep: 'shipping' }))
      .mockResolvedValueOnce(txBase({ escrowStep: 'delivered' }));

    await advanceEscrow('tx1', 'seller1');
    await advanceEscrow('tx1', 'buyer1');
    await advanceEscrow('tx1', 'buyer1');

    expect(notificationService.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'buyer1', action: 'transaction.shippingRequired', entityId: 'tx1' }));
    expect(notificationService.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'seller1', action: 'transaction.deliveryConfirmed', entityId: 'tx1' }));
    expect(notificationService.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'seller1', action: 'transaction.released', entityId: 'tx1' }));
  });

  it('notifies trade counterpart and both users on completion', async () => {
    (Transaction.findById as jest.Mock)
      .mockResolvedValueOnce(txBase({ type: 'trade', partyAReceived: false, partyBReceived: false }))
      .mockResolvedValueOnce(txBase({ type: 'trade', partyAReceived: true, partyBReceived: false }));

    await confirmTrade('tx1', 'buyer1', 'A', true, false);
    await confirmTrade('tx1', 'seller1', 'B', true, true);

    expect(notificationService.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'seller1', action: 'transaction.tradeUpdated', entityId: 'tx1' }));
    expect(notificationService.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'buyer1', action: 'transaction.tradeUpdated', entityId: 'tx1' }));
    expect(notificationService.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'buyer1', action: 'transaction.tradeCompleted', entityId: 'tx1' }));
    expect(notificationService.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'seller1', action: 'transaction.tradeCompleted', entityId: 'tx1' }));
  });
});
