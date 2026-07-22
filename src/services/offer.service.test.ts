jest.mock('../models/offer.model', () => ({
  Offer: {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

jest.mock('../models/listing.model', () => ({
  Listing: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
  },
}));

jest.mock('../models/transaction.model', () => ({
  Transaction: {
    create: jest.fn(),
  },
}));

jest.mock('../models/user.model', () => ({
  User: {
    findById: jest.fn(),
  },
}));

jest.mock('./notification.service', () => ({
  create: jest.fn(),
}));

import { Listing } from '../models/listing.model';
import { Offer } from '../models/offer.model';
import { Transaction } from '../models/transaction.model';
import { User } from '../models/user.model';
import * as notificationService from './notification.service';
import { create, respond } from './offer.service';

const id = (value: string) => ({ toString: () => value });

describe('offer.service notification contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (notificationService.create as jest.Mock).mockResolvedValue({ _id: 'n1' });
  });

  it('notifies seller when buyer creates offer', async () => {
    (Offer.create as jest.Mock).mockResolvedValue({ _id: id('offer1'), listingId: 'listing1', buyerId: 'buyer1' });
    (Listing.findById as jest.Mock).mockResolvedValue({ sellerId: id('seller1'), title: 'Máy ảnh' });

    await create({ listingId: 'listing1' } as any);

    expect(notificationService.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'seller1',
      type: 'offer',
      entityType: 'offer',
      entityId: 'offer1',
      action: 'offer.created',
      deeplink: '/offers/list',
      relatedId: 'offer1',
    }));
  });

  it('uses offer contract when rejecting offer', async () => {
    (Offer.findById as jest.Mock).mockResolvedValue({ _id: id('offer1'), listingId: 'listing1', buyerId: id('buyer1') });
    (Listing.findById as jest.Mock).mockResolvedValue({ _id: id('listing1'), sellerId: id('seller1'), title: 'Máy ảnh' });
    (Offer.findOneAndUpdate as jest.Mock).mockResolvedValue({ _id: id('offer1'), status: 'rejected' });

    await respond('offer1', 'seller1', false);

    expect(notificationService.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'buyer1',
      type: 'offer',
      entityType: 'offer',
      entityId: 'offer1',
      action: 'offer.rejected',
      deeplink: '/offers/list',
      relatedId: 'offer1',
    }));
  });

  it('uses transaction contract when accepting offer', async () => {
    const claimed = { _id: id('offer1'), save: jest.fn().mockResolvedValue(undefined) };
    (Offer.findById as jest.Mock).mockResolvedValue({
      _id: id('offer1'),
      listingId: 'listing1',
      buyerId: id('buyer1'),
      type: 'buy',
      price: 100,
    });
    (Listing.findById as jest.Mock).mockResolvedValue({
      _id: id('listing1'),
      sellerId: id('seller1'),
      sellerName: 'Seller',
      title: 'Máy ảnh',
      price: 120,
      status: 'active',
    });
    (Offer.findOneAndUpdate as jest.Mock).mockResolvedValue(claimed);
    (Listing.findOneAndUpdate as jest.Mock).mockResolvedValue({ _id: id('listing1') });
    (User.findById as jest.Mock).mockReturnValue({ select: jest.fn().mockResolvedValue({ fullName: 'Buyer' }) });
    (Transaction.create as jest.Mock).mockResolvedValue({ _id: id('tx1') });

    await respond('offer1', 'seller1', true);

    expect(notificationService.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'buyer1',
      type: 'offer',
      entityType: 'transaction',
      entityId: 'tx1',
      action: 'offer.accepted',
      deeplink: '/transactions/sale/tx1',
      relatedId: 'tx1',
    }));
  });
});
