export interface UnitConfig {
  id: string;
  name: string;
  fullName: string;
  spreadsheetId: string;
}

export const UNIT_CONFIGS: Record<string, UnitConfig> = {
  GSR: { id: 'GSR', name: 'GSR', fullName: 'Graduate Studies & Research', spreadsheetId: '14Z6hsOOx4reMzE5KYIkWgVi31BAuQSOwkZnE7Qhzqvk' },
  SON: { id: 'SON', name: 'SON', fullName: 'School of Nursing', spreadsheetId: '19CETyNi3jWANW2uo8kchiYjkApAZuULU_OPUAHxvbX0' },
  SArD: { id: 'SArD', name: 'SArD', fullName: 'School of Architecture and Design', spreadsheetId: '1RfVZl-XYzQdo6FQK70PJhyw-qnnORM6LaE8Sg_cpFbA' },
  SOP: { id: 'SOP', name: 'SOP', fullName: 'School of Pharmacy', spreadsheetId: '18dM2q_hWLGUQjBw9PHUjKwWh9NMDYCNFzjvMipFt9Do' },
  SOM: { id: 'SOM', name: 'SOM', fullName: 'School of Medicine', spreadsheetId: '1u32vOYd1vEcHfPkHtNJWTk_AkQLpSUOcsV28k_yePXM' },
  AKSOB: { id: 'AKSOB', name: 'AKSOB', fullName: 'Adnan Kassar School of Business', spreadsheetId: '1x2ItlwuWShCIXm40EvpKFF8wCoXWf_YRnfGExwFXoFE' },
  SOE: { id: 'SOE', name: 'SOE', fullName: 'School of Engineering', spreadsheetId: '1wu1tdcZ_ouNasgSc5RqnDLQFemvXgIuOmUHF8-i_U14' },
  SAS: { id: 'SAS', name: 'SoAS', fullName: 'School of Arts & Sciences', spreadsheetId: '1-VysXFHNlvL5oUYolBUQ-TasLufO4yF7xatFpaWel2E' },
  DIRA: { id: 'DIRA', name: 'DIRA', fullName: 'Department of Institutional Research and Assessment', spreadsheetId: '1iAKPKguUvCYEN-Tojo91TXR-f-RXLtaeO3awt0nDCDk' },
  CIL: { id: 'CIL', name: 'CIL', fullName: 'Center for Innovation & Learning', spreadsheetId: '1KNm1MpH-vxgpD-z-_eguZyqsZd6nvEOk_S6LZG0WsvQ' },
  Libraries: { id: 'Libraries', name: 'Libraries', fullName: 'Libraries', spreadsheetId: '17mx75Ejrvnb_sWkN4QyWUs2D-V7UHcrnHjR_lsTYCaY' },
  BDGA: { id: 'BDGA', name: 'BDGA', fullName: 'Business Development & Global Affairs', spreadsheetId: '16N8vAsbQ0JA09bfKRZxCP7xojzFWEboj8ugZPr8RDX8' },
  SDEM: { id: 'SDEM', name: 'SDEM', fullName: 'Student Development and Enrollment Management', spreadsheetId: '19423B49RTOlsR1oD7A9YhVfz14w5rP-wA7-sy-x4V04' },
  IT: { id: 'IT', name: 'IT', fullName: 'Information Technology', spreadsheetId: '1MYMfXSMFYksiMS3GUXGSoI12-2qg5V-UwMXv7XFshqw' },
  Facilities: { id: 'Facilities', name: 'Facilities', fullName: 'Facilities', spreadsheetId: '1FOwt5PkOPQnUX_NdmPbzPRbaan9MEeRoXiWB1i-FR0g' },
  Finance: { id: 'Finance', name: 'Finance', fullName: 'Finance', spreadsheetId: '1SWb0okdTuFZub8XFS6tclitCv-FRaSXbcvx6kagvvu4' },
  UGRC: { id: 'UGRC', name: 'UGRC', fullName: 'University Graduate and Research Council', spreadsheetId: '1fX5EtFll-K2kFTIym1bf-SS_pbrcOwTpvAsEFdZHDuE' },
  StratCom_Alumni: { id: 'StratCom_Alumni', name: 'CAR', fullName: 'Communications and Alumni Relations', spreadsheetId: '1jyGyHMJTie_iy044AuB7TBOgxBjVNXzqAd2sQMYENgk' },
  Advancement: { id: 'Advancement', name: 'Advancement', fullName: 'Advancement', spreadsheetId: '12xmb1qYhAGSBMkqQO-6LUrgp4uiGcdP3D0nyf3FF6Rs' },
  Provost: { id: 'Provost', name: 'Provost', fullName: 'Office of the Provost', spreadsheetId: '1cVGQZz1GGuoyEv0kljKJY4jCqauvR6K8IM_FIfYwkqE' },
  PwD: { id: 'PwD', name: 'PwD', fullName: 'Persons with Disabilities Committee', spreadsheetId: '1TEr6TeZ_rfHewK7_Pozl3DgHyK6Y1LTfyIt-P139T58' },
  OfS: { id: 'OfS', name: 'OfS', fullName: 'Office of Sustainability', spreadsheetId: '1vzHWVOOL02qwdSX4RnT3rvECGcB0FSvXCgxPRKbha1Q' },
};

export const UNIT_IDS = Object.keys(UNIT_CONFIGS);

export function getUnitConfig(unitId: string): UnitConfig | undefined {
  return UNIT_CONFIGS[unitId];
}

/** Returns "DisplayName — Full Name" e.g. "SoAS — School of Arts & Sciences" */
export function getUnitDisplayLabel(unitId: string): string {
  const config = UNIT_CONFIGS[unitId];
  if (!config) return unitId;
  return `${config.name} — ${config.fullName}`;
}

/** Returns just the short display name e.g. "SoAS" instead of raw ID "SAS" */
export function getUnitDisplayName(unitId: string): string {
  return UNIT_CONFIGS[unitId]?.name || unitId;
}
