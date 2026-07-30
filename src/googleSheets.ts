import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { initializeApp, getApps, getApp } from 'firebase/app';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

let cachedAccessToken: string | null = localStorage.getItem('sahyadri_gsheet_token') || null;
let isSigningIn = false;

export const initSheetsAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      if (!isSigningIn) {
        cachedAccessToken = null;
        localStorage.removeItem('sahyadri_gsheet_token');
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

export const googleSheetsSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google access token');
    }
    cachedAccessToken = credential.accessToken;
    localStorage.setItem('sahyadri_gsheet_token', cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sheets sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getSheetsAccessToken = (): string | null => {
  return cachedAccessToken;
};

export interface VolunteerData {
  timestamp?: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  role: string;
  skills: string;
  language: string;
}

export const getOrCreateVolunteerSheet = async (token: string, existingSheetId?: string): Promise<string> => {
  const targetId = existingSheetId || localStorage.getItem('sahyadri_volunteer_sheet_id');
  if (targetId) {
    try {
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${targetId}?fields=spreadsheetId`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) return targetId;
    } catch (e) {
      console.warn('Could not verify existing sheet, creating new one...', e);
    }
  }

  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: 'Sahyadri Bachav - Volunteer Submissions (Official)'
      },
      sheets: [
        {
          properties: {
            title: 'Volunteers',
            gridProperties: {
              frozenRowCount: 1
            }
          },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: [
                    { userEnteredValue: { stringValue: 'Submission Date' } },
                    { userEnteredValue: { stringValue: 'Full Name' } },
                    { userEnteredValue: { stringValue: 'Email Address' } },
                    { userEnteredValue: { stringValue: 'Phone Number' } },
                    { userEnteredValue: { stringValue: 'Village / City' } },
                    { userEnteredValue: { stringValue: 'Focus Area / Role' } },
                    { userEnteredValue: { stringValue: 'Additional Skills / Notes' } },
                    { userEnteredValue: { stringValue: 'Language' } }
                  ]
                }
              ]
            }
          ]
        }
      ]
    })
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Google Sheet: ${errText}`);
  }

  const data = await createRes.json();
  const newSheetId = data.spreadsheetId;
  localStorage.setItem('sahyadri_volunteer_sheet_id', newSheetId);
  return newSheetId;
};

export const appendVolunteerToSheet = async (token: string, sheetId: string, vol: VolunteerData) => {
  const formattedDate = vol.timestamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const rowValues = [
    formattedDate,
    vol.name,
    vol.email,
    vol.phone || 'N/A',
    vol.location,
    vol.role,
    vol.skills || 'N/A',
    (vol.language || 'mr').toUpperCase()
  ];

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Volunteers!A:H:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: 'Volunteers!A:H',
      majorDimension: 'ROWS',
      values: [rowValues]
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Sheets append failed: ${err}`);
  }

  return await res.json();
};

export const batchSyncVolunteersToSheet = async (token: string, sheetId: string, volunteers: VolunteerData[]) => {
  if (volunteers.length === 0) return;

  const rows = volunteers.map(vol => [
    vol.timestamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    vol.name,
    vol.email,
    vol.phone || 'N/A',
    vol.location,
    vol.role,
    vol.skills || 'N/A',
    (vol.language || 'mr').toUpperCase()
  ]);

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Volunteers!A:H:append?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      range: 'Volunteers!A:H',
      majorDimension: 'ROWS',
      values: rows
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Sheets batch append failed: ${err}`);
  }

  return await res.json();
};
