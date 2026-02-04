// User Types for Police Case Tracking System

export type UserRole = 'Writer' | 'SHO' | 'SP';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  policeStation: string;
  employeeNumber: string;
}

export interface AuthUser extends User {
  password: string;
}

// Mock users for demonstration
export const MOCK_USERS: AuthUser[] = [
  {
    id: '1',
    username: 'writer1',
    password: 'password123',
    name: 'Constable Ravi Kumar',
    role: 'Writer',
    policeStation: 'Davangere City PS',
    employeeNumber: 'EMP001',
  },
  {
    id: '2',
    username: 'writer2',
    password: 'password123',
    name: 'Constable Suma B',
    role: 'Writer',
    policeStation: 'Harihar PS',
    employeeNumber: 'EMP002',
  },
  {
    id: '3',
    username: 'sho1',
    password: 'password123',
    name: 'Inspector Manjunath R',
    role: 'SHO',
    policeStation: 'Davangere City PS',
    employeeNumber: 'SHO001',
  },
  {
    id: '4',
    username: 'sho2',
    password: 'password123',
    name: 'Inspector Lakshmi Devi',
    role: 'SHO',
    policeStation: 'Harihar PS',
    employeeNumber: 'SHO002',
  },
  {
    id: '5',
    username: 'sp1',
    password: 'password123',
    name: 'SP Uma Prashanth',
    role: 'SP',
    policeStation: 'District HQ',
    employeeNumber: 'SP001',
  },
];

// Police Stations in Davangere District
export const POLICE_STATIONS = [
  'Davangere City PS',
  'Harihar PS',
  'Jagalur PS',
  'Harapanahalli PS',
  'Channagiri PS',
  'Nyamathi PS',
  'Davangere Rural PS',
  'District HQ',
];
