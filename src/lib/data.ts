
export type Asset = {
  assetId: string;
  address: string;
  yearInstalled: number | string;
  material: 'Concrete' | 'Polyethylene' | 'Fibreglass';
  setbackFromWaterSource: number | string;
  setbackFromHouse: number | string;
  tankBuryDepth: number | string;
  openingSize: number | string;
  aboveGroundCollarHeight: number | string;
  systemType: 'Cistern' | 'Septic Tank';
  assetSubType: 'Cistern' | 'Pump Out' | 'Mound' | 'Septic Field' | 'Other' | 'Unknown';
  siteCondition: number | string;
  coverCondition: number | string;
  collarCondition: number | string;
  interiorCondition: number | string;
  overallCondition: number | string;
  abandoned: 'Yes' | 'No';
  fieldNotes: string;
};

export type RepairPrice = {
  id: string;
  repairType: string;
  unitPrice: number;
  description: string;
};

export const initialAssets: Asset[] = [
  {
    assetId: 'C-001',
    address: '123 Willow Creek Rd',
    yearInstalled: 2015,
    material: 'Concrete',
    setbackFromWaterSource: 30,
    setbackFromHouse: 15,
    tankBuryDepth: 1.2,
    openingSize: 0.6,
    aboveGroundCollarHeight: 0.2,
    systemType: 'Cistern',
    assetSubType: 'Cistern',
    siteCondition: 5,
    coverCondition: 4,
    collarCondition: 5,
    interiorCondition: 5,
    overallCondition: 5,
    abandoned: 'No',
    fieldNotes: 'System appears in good condition.',
  },
  {
    assetId: 'S-001',
    address: '456 Oak Hollow Ln',
    yearInstalled: 2008,
    material: 'Polyethylene',
    setbackFromWaterSource: 50,
    setbackFromHouse: 20,
    tankBuryDepth: 1.5,
    openingSize: 0.7,
    aboveGroundCollarHeight: 0.1,
    systemType: 'Septic Tank',
    assetSubType: 'Pump Out',
    siteCondition: 4,
    coverCondition: 3,
    collarCondition: 4,
    interiorCondition: 3,
    overallCondition: 3,
    abandoned: 'No',
    fieldNotes: 'Cover has minor cracks. Effluent levels normal.',
  },
  {
    assetId: 'S-002',
    address: '789 Pine Ridge Trl',
    yearInstalled: 1999,
    material: 'Concrete',
    setbackFromWaterSource: 45,
    setbackFromHouse: 10,
    tankBuryDepth: 1.0,
    openingSize: 0.6,
    aboveGroundCollarHeight: 0.3,
    systemType: 'Septic Tank',
    assetSubType: 'Septic Field',
    siteCondition: 2,
    coverCondition: 2,
    collarCondition: 3,
    interiorCondition: 2,
    overallCondition: 2,
    abandoned: 'No',
    fieldNotes: 'Lid is damaged. Visible roots near tank. Signs of past overflows.',
  },
  {
    assetId: 'C-002',
    address: '321 Maple Grove Ave',
    yearInstalled: 2020,
    material: 'Fibreglass',
    setbackFromWaterSource: 60,
    setbackFromHouse: 25,
    tankBuryDepth: 1.8,
    openingSize: 0.5,
    aboveGroundCollarHeight: 0.2,
    systemType: 'Cistern',
    assetSubType: 'Cistern',
    siteCondition: 5,
    coverCondition: 5,
    collarCondition: 5,
    interiorCondition: 5,
    overallCondition: 5,
    abandoned: 'No',
    fieldNotes: 'New installation. Excellent condition.',
  },
  {
    assetId: 'S-003',
    address: '654 Birchwood Dr',
    yearInstalled: 2012,
    material: 'Polyethylene',
    setbackFromWaterSource: 35,
    setbackFromHouse: 18,
    tankBuryDepth: 1.3,
    openingSize: 0.7,
    aboveGroundCollarHeight: 0.15,
    systemType: 'Septic Tank',
    assetSubType: 'Mound',
    siteCondition: 4,
    coverCondition: 4,
    collarCondition: 4,
    interiorCondition: 4,
    overallCondition: 4,
    abandoned: 'No',
    fieldNotes: 'No issues noted during last inspection.',
  },
];


export const initialRepairPrices: RepairPrice[] = [
  { id: 'REPAIR-01', repairType: 'Pump Seal Replacement', unitPrice: 500, description: 'Replacement of the main pump seal to prevent leaks.' },
  { id: 'REPAIR-02', repairType: 'Pump Impeller Replacement', unitPrice: 1200, description: 'Full replacement of the pump impeller assembly.' },
  { id: 'REPAIR-03', repairType: 'Valve Gasket Replacement', unitPrice: 250, description: 'Replacement of worn gaskets on primary valves.' },
  { id: 'REPAIR-04', repairType: 'Pipe Patching (per foot)', unitPrice: 150, description: 'Minor pipe repair for small cracks or holes. Price is per linear foot.' },
  { id: 'REPAIR-05', repairType: 'Full Pipe Section Replacement (per foot)', unitPrice: 400, description: 'Complete replacement of a damaged pipe section. Price is per linear foot.' },
  { id: 'REPAIR-06', repairType: 'Tank Relining', unitPrice: 5000, description: 'Application of a new interior lining to a concrete tank to seal cracks and prevent leaks.' },
];
