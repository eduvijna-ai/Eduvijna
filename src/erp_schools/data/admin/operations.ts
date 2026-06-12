/** Admin mock fixtures — operations (library, books, transport, vehicles, routes, hostel, inventory). */

import type { AdminMetric, OpsListRow, DistributionRow } from '../../types/admin';

// ── Library ──────────────────────────────────────────────────────────────
export const libraryKpis: AdminMetric[] = [
  { key: 'books', icon: 'library-outline', value: '12,480', label: 'Total Books', accent: 'teal' },
  { key: 'issued', icon: 'book-outline', value: '864', label: 'Issued', accent: 'blue' },
  { key: 'overdue', icon: 'alert-circle-outline', value: '42', label: 'Overdue', accent: 'red' },
  { key: 'members', icon: 'people-outline', value: '2,584', label: 'Members', accent: 'green' },
];

export const libraryActivity: OpsListRow[] = [
  { id: 'lb1', title: 'Wings of Fire', subtitle: 'Issued to Aarav Kumar • 7-B', value: 'Due 22 Jun', status: 'active', icon: 'book-outline', accent: 'blue' },
  { id: 'lb2', title: 'The Alchemist', subtitle: 'Returned by Priya Singh • 8-A', value: 'Returned', status: 'active', icon: 'checkmark-circle-outline', accent: 'green' },
  { id: 'lb3', title: 'A Brief History of Time', subtitle: 'Overdue • Rohan Khanna • 9-A', value: '3 days late', status: 'inactive', icon: 'alert-circle-outline', accent: 'red' },
];

export const bookKpis: AdminMetric[] = [
  { key: 'titles', icon: 'library-outline', value: '4,210', label: 'Unique Titles', accent: 'teal' },
  { key: 'copies', icon: 'documents-outline', value: '12,480', label: 'Total Copies', accent: 'blue' },
  { key: 'avail', icon: 'checkmark-circle-outline', value: '11,616', label: 'Available', accent: 'green' },
  { key: 'cat', icon: 'pricetags-outline', value: '38', label: 'Categories', accent: 'purple' },
];

export const bookCatalog: OpsListRow[] = [
  { id: 'bk1', title: 'Mathematics Grade 10', subtitle: 'Academic • 240 copies', value: '210 left', status: 'active', icon: 'book-outline', accent: 'purple' },
  { id: 'bk2', title: 'Science Encyclopedia', subtitle: 'Reference • 80 copies', value: '64 left', status: 'active', icon: 'flask-outline', accent: 'green' },
  { id: 'bk3', title: 'English Literature', subtitle: 'Fiction • 150 copies', value: '12 left', status: 'leave', icon: 'book-outline', accent: 'orange' },
  { id: 'bk4', title: 'History of India', subtitle: 'Reference • 90 copies', value: '0 left', status: 'inactive', icon: 'globe-outline', accent: 'red' },
];

// ── Transport ──────────────────────────────────────────────────────────────
export const transportKpis: AdminMetric[] = [
  { key: 'buses', icon: 'bus-outline', value: '24', label: 'Total Buses', accent: 'teal' },
  { key: 'routes', icon: 'map-outline', value: '18', label: 'Active Routes', accent: 'blue' },
  { key: 'students', icon: 'people-outline', value: '1,240', label: 'Students', accent: 'green' },
  { key: 'maint', icon: 'construct-outline', value: '2', label: 'In Maintenance', accent: 'orange' },
];

export const transportRoutesSummary: OpsListRow[] = [
  { id: 'tr1', title: 'Route 01 — North Zone', subtitle: 'Bus KA-01-AB-1234 • 42 students', value: 'On Time', status: 'active', icon: 'bus-outline', accent: 'teal' },
  { id: 'tr2', title: 'Route 02 — East Zone', subtitle: 'Bus KA-01-AB-2234 • 38 students', value: 'On Time', status: 'active', icon: 'bus-outline', accent: 'blue' },
  { id: 'tr3', title: 'Route 03 — South Zone', subtitle: 'Bus KA-01-AB-3234 • 45 students', value: 'Delayed', status: 'leave', icon: 'bus-outline', accent: 'orange' },
];

export const vehicleKpis: AdminMetric[] = [
  { key: 'total', icon: 'bus-outline', value: '24', label: 'Total Vehicles', accent: 'teal' },
  { key: 'active', icon: 'checkmark-circle-outline', value: '22', label: 'Active', accent: 'green' },
  { key: 'maint', icon: 'construct-outline', value: '2', label: 'Maintenance', accent: 'orange' },
  { key: 'fuel', icon: 'speedometer-outline', value: '₹1.2L', label: 'Fuel (Month)', accent: 'blue' },
];

export const vehicles: OpsListRow[] = [
  { id: 'vh1', title: 'KA-01-AB-1234', subtitle: 'Driver: Ramesh • Route 01', value: 'Active', status: 'active', icon: 'bus-outline', accent: 'teal' },
  { id: 'vh2', title: 'KA-01-AB-2234', subtitle: 'Driver: Suresh • Route 02', value: 'Active', status: 'active', icon: 'bus-outline', accent: 'blue' },
  { id: 'vh3', title: 'KA-01-AB-3234', subtitle: 'Driver: Mahesh • Route 03', value: 'Service Due', status: 'leave', icon: 'bus-outline', accent: 'orange' },
  { id: 'vh4', title: 'KA-01-AB-4234', subtitle: 'Unassigned', value: 'Maintenance', status: 'inactive', icon: 'bus-outline', accent: 'red' },
];

export const routes: OpsListRow[] = [
  { id: 'rt1', title: 'Route 01 — North Zone', subtitle: '12 stops • 18.4 km', value: '42 students', status: 'active', icon: 'map-outline', accent: 'teal' },
  { id: 'rt2', title: 'Route 02 — East Zone', subtitle: '10 stops • 14.2 km', value: '38 students', status: 'active', icon: 'map-outline', accent: 'blue' },
  { id: 'rt3', title: 'Route 03 — South Zone', subtitle: '14 stops • 21.0 km', value: '45 students', status: 'active', icon: 'map-outline', accent: 'green' },
  { id: 'rt4', title: 'Route 04 — West Zone', subtitle: '11 stops • 16.8 km', value: '36 students', status: 'active', icon: 'map-outline', accent: 'purple' },
];

// ── Hostel ──────────────────────────────────────────────────────────────────
export const hostelKpis: AdminMetric[] = [
  { key: 'capacity', icon: 'bed-outline', value: '480', label: 'Total Capacity', accent: 'teal' },
  { key: 'occupied', icon: 'people-outline', value: '412', label: 'Occupied', accent: 'green' },
  { key: 'vacant', icon: 'add-circle-outline', value: '68', label: 'Vacant', accent: 'blue' },
  { key: 'leave', icon: 'time-outline', value: '14', label: 'On Leave', accent: 'orange' },
];

export const hostelOccupancy: DistributionRow[] = [
  { id: 'ho1', label: 'Boys Hostel', value: '236 / 280 (84%)', percent: 84, color: 'info' },
  { id: 'ho2', label: 'Girls Hostel', value: '176 / 200 (88%)', percent: 88, color: 'success' },
];

export const hostelRooms: OpsListRow[] = [
  { id: 'hr1', title: 'Block A — Floor 1', subtitle: 'Boys • 24 rooms', value: '92% full', status: 'active', icon: 'business-outline', accent: 'blue' },
  { id: 'hr2', title: 'Block B — Floor 2', subtitle: 'Girls • 20 rooms', value: '88% full', status: 'active', icon: 'business-outline', accent: 'pink' },
  { id: 'hr3', title: 'Block C — Floor 1', subtitle: 'Boys • 18 rooms', value: '76% full', status: 'active', icon: 'business-outline', accent: 'teal' },
];

// ── Inventory ──────────────────────────────────────────────────────────────
export const inventoryKpis: AdminMetric[] = [
  { key: 'items', icon: 'cube-outline', value: '1,860', label: 'Total Items', accent: 'teal' },
  { key: 'value', icon: 'pricetag-outline', value: '₹24.5L', label: 'Stock Value', accent: 'green' },
  { key: 'low', icon: 'alert-circle-outline', value: '38', label: 'Low Stock', accent: 'orange' },
  { key: 'out', icon: 'close-circle-outline', value: '6', label: 'Out of Stock', accent: 'red' },
];

export const inventoryItems: OpsListRow[] = [
  { id: 'in1', title: 'Lab Equipment', subtitle: 'Science department', value: '420 units', status: 'active', icon: 'flask-outline', accent: 'green' },
  { id: 'in2', title: 'Sports Equipment', subtitle: 'Physical education', value: '186 units', status: 'active', icon: 'football-outline', accent: 'orange' },
  { id: 'in3', title: 'Stationery', subtitle: 'Administration', value: '24 units left', status: 'leave', icon: 'document-outline', accent: 'blue' },
  { id: 'in4', title: 'Computers', subtitle: 'Computer lab', value: '0 units left', status: 'inactive', icon: 'desktop-outline', accent: 'red' },
];
