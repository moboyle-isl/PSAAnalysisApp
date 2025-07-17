export type Asset = {
  id: string;
  name: string;
  type: 'Pump' | 'Valve' | 'Pipe' | 'Tank';
  conditionScore: number;
  installDate: string;
  lastMaintenance: string;
  maintenanceHistory: string;
  usageIntensity: 'Light' | 'Moderate' | 'Heavy';
};

export type RepairPrice = {
  id: string;
  repairType: string;
  unitPrice: number;
};

export const initialAssets: Asset[] = [
  {
    id: 'ASSET-001',
    name: 'Main Water Pump',
    type: 'Pump',
    conditionScore: 85,
    installDate: '2018-03-15',
    lastMaintenance: '2023-11-01',
    maintenanceHistory: 'Regular annual checkups, impeller replaced in 2021.',
    usageIntensity: 'Heavy',
  },
  {
    id: 'ASSET-002',
    name: 'Section 5 Gate Valve',
    type: 'Valve',
    conditionScore: 92,
    installDate: '2020-07-22',
    lastMaintenance: '2024-01-10',
    maintenanceHistory: 'Lubricated annually.',
    usageIntensity: 'Moderate',
  },
  {
    id: 'ASSET-003',
    name: 'Primary Distribution Pipe',
    type: 'Pipe',
    conditionScore: 70,
    installDate: '2010-01-05',
    lastMaintenance: '2022-05-20',
    maintenanceHistory: 'Minor leak patched in 2019. Visual inspection every 2 years.',
    usageIntensity: 'Heavy',
  },
  {
    id: 'ASSET-004',
    name: 'Holding Tank Alpha',
    type: 'Tank',
    conditionScore: 95,
    installDate: '2015-09-30',
    lastMaintenance: '2023-08-14',
    maintenanceHistory: 'Cleaned and inspected every 2 years.',
    usageIntensity: 'Light',
  },
   {
    id: 'ASSET-005',
    name: 'Secondary Coolant Pump',
    type: 'Pump',
    conditionScore: 65,
    installDate: '2016-06-18',
    lastMaintenance: '2023-02-21',
    maintenanceHistory: 'Seal replaced in 2022. Shows signs of vibration.',
    usageIntensity: 'Heavy',
  },
];

export const initialRepairPrices: RepairPrice[] = [
  { id: 'REPAIR-01', repairType: 'Pump Seal Replacement', unitPrice: 500 },
  { id: 'REPAIR-02', repairType: 'Pump Impeller Replacement', unitPrice: 1200 },
  { id: 'REPAIR-03', repairType: 'Valve Gasket Replacement', unitPrice: 250 },
  { id: 'REPAIR-04', repairType: 'Pipe Patching (per foot)', unitPrice: 150 },
  { id: 'REPAIR-05', repairType: 'Full Pipe Section Replacement (per foot)', unitPrice: 400 },
  { id: 'REPAIR-06', repairType: 'Tank Relining', unitPrice: 5000 },
];
