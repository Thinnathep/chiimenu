export type PackageId = '14d' | 'monthly' | 'yearly';

export interface PackagePricing {
  id: PackageId;
  name: string;
  days: number;
  standard: number;
  firstTime: number;
}

export const SUBSCRIPTION_PACKAGES: Record<PackageId, PackagePricing> = {
  '14d': {
    id: '14d',
    name: 'แพ็กเกจ 14 วัน',
    days: 14,
    standard: 149,
    firstTime: 75,
  },
  'monthly': {
    id: 'monthly',
    name: 'แพ็กเกจ 1 เดือน',
    days: 30,
    standard: 259,
    firstTime: 129,
  },
  'yearly': {
    id: 'yearly',
    name: 'แพ็กเกจ 1 ปี',
    days: 365,
    standard: 2590,
    firstTime: 1295,
  }
};
