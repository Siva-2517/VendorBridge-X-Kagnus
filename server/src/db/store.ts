import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { User, Vendor, PurchaseOrder, PasswordResetToken, AuditLog, Role, VendorStatus, POStatus } from '../types';

interface DatabaseSchema {
  users: User[];
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  passwordResetTokens: PasswordResetToken[];
  auditLogs: AuditLog[];
}

const DATA_DIR = path.resolve(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

class DatabaseStore {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDirectory();
    this.data = this.loadData();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private save() {
    fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  private loadData(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(content);
      } catch (err) {
        console.error('Failed to parse existing store.json, reinitializing...', err);
      }
    }

    return this.initializeSeedData();
  }

  private initializeSeedData(): DatabaseSchema {
    const salt = bcrypt.genSaltSync(10);
    const defaultPasswordHash = bcrypt.hashSync('VendorBridge@2025', salt);
    const now = new Date().toISOString();

    const seedUsers: User[] = [
      {
        id: 'usr-admin-01',
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin@vendorbridge.com',
        passwordHash: defaultPasswordHash,
        phoneNumber: '+91 98765 00001',
        role: Role.ADMIN,
        country: 'India',
        additionalInfo: 'Chief Administrator & Security Lead',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'usr-officer-01',
        firstName: 'Rahul',
        lastName: 'Mehta',
        email: 'officer@vendorbridge.com',
        passwordHash: defaultPasswordHash,
        phoneNumber: '+91 98765 00002',
        role: Role.PROCUREMENT_OFFICER,
        country: 'India',
        additionalInfo: 'Senior Procurement Officer',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'usr-manager-01',
        firstName: 'Priya',
        lastName: 'Shah',
        email: 'manager@vendorbridge.com',
        passwordHash: defaultPasswordHash,
        phoneNumber: '+91 98765 00003',
        role: Role.MANAGER_APPROVER,
        country: 'India',
        additionalInfo: 'Finance & Approvals Manager',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'usr-vendor-01',
        firstName: 'Vikram',
        lastName: 'Patel',
        email: 'vendor@infrasupplies.com',
        passwordHash: defaultPasswordHash,
        phoneNumber: '+91 98765 43210',
        role: Role.VENDOR,
        country: 'India',
        additionalInfo: 'Authorized Vendor Representative',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    // Seed vendors exactly reflecting Screen 4: 28 Total (21 Active, 4 Pending, 3 Blocked)
    const seedVendors: Vendor[] = [
      {
        id: 'vnd-01',
        name: 'Infra Supplies Pvt Ltd',
        category: 'Constructions',
        gstin: '27AABC1576214B0',
        contactPerson: 'Vikram Patel',
        email: 'contact@infrasupplies.com',
        phone: '+91 98765 43210',
        address: '456 Industrial Estate, GIDC Naroda',
        city: 'Ahmedabad',
        state: 'Gujarat',
        pincode: '382330',
        country: 'India',
        status: VendorStatus.ACTIVE,
        notes: 'Preferred supplier for building and construction materials',
        userId: 'usr-vendor-01',
        createdById: 'usr-officer-01',
        createdAt: '2025-01-10T09:00:00.000Z',
        updatedAt: '2025-01-10T09:00:00.000Z',
      },
      {
        id: 'vnd-02',
        name: 'Tech Core LTD',
        category: 'IT',
        gstin: '27AABC1576214B1',
        contactPerson: 'Ananya Sharma',
        email: 'info@techcore.com',
        phone: '+91 98220 12345',
        address: 'Tower B, Cyber City, Phase 2',
        city: 'Gurugram',
        state: 'Haryana',
        pincode: '122002',
        country: 'India',
        status: VendorStatus.ACTIVE,
        notes: 'Enterprise hardware and cloud infrastructure vendor',
        createdById: 'usr-officer-01',
        createdAt: '2025-01-12T10:30:00.000Z',
        updatedAt: '2025-01-12T10:30:00.000Z',
      },
      {
        id: 'vnd-03',
        name: 'FastLog Transport',
        category: 'Logistics',
        gstin: '27AABC1576214B2',
        contactPerson: 'Suresh Kumar',
        email: 'dispatch@fastlog.com',
        phone: '+91 98110 54321',
        address: 'Plot 78, Logistics Park, NH 48',
        city: 'Bhiwandi',
        state: 'Maharashtra',
        pincode: '421302',
        country: 'India',
        status: VendorStatus.BLOCKED,
        notes: 'Delivery SLA violation under review',
        createdById: 'usr-admin-01',
        createdAt: '2025-01-14T11:15:00.000Z',
        updatedAt: '2025-02-01T15:00:00.000Z',
      },
      {
        id: 'vnd-04',
        name: 'Officelead Co',
        category: 'Stationery',
        gstin: '27AABC1576214B3',
        contactPerson: 'Deepak Joshi',
        email: 'orders@officelead.com',
        phone: '+91 98990 11223',
        address: '12 Commerce House, Fort',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        country: 'India',
        status: VendorStatus.ACTIVE,
        notes: 'Office supplies, ergonomic furniture & stationery items',
        createdById: 'usr-officer-01',
        createdAt: '2025-01-15T14:20:00.000Z',
        updatedAt: '2025-01-15T14:20:00.000Z',
      },
      {
        id: 'vnd-05',
        name: 'Apex Precision Tools',
        category: 'Manufacturing',
        gstin: '27AABC1576214B4',
        contactPerson: 'Karan Singh',
        email: 'sales@apextools.in',
        phone: '+91 97120 44556',
        address: 'Sector 58, IMT Manesar',
        city: 'Gurugram',
        state: 'Haryana',
        pincode: '122050',
        country: 'India',
        status: VendorStatus.PENDING,
        notes: 'Awaiting ISO compliance certificate verification',
        createdById: 'usr-officer-01',
        createdAt: '2025-02-05T08:00:00.000Z',
        updatedAt: '2025-02-05T08:00:00.000Z',
      },
      {
        id: 'vnd-06',
        name: 'GreenLeaf Packaging Solutions',
        category: 'Packaging',
        gstin: '27AABC1576214B5',
        contactPerson: 'Meera Nambiar',
        email: 'info@greenleafpack.com',
        phone: '+91 98450 66778',
        address: 'Peenya Industrial Area, 3rd Stage',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560058',
        country: 'India',
        status: VendorStatus.ACTIVE,
        notes: 'Biodegradable corrugated shipping boxes',
        createdById: 'usr-officer-01',
        createdAt: '2025-02-06T10:00:00.000Z',
        updatedAt: '2025-02-06T10:00:00.000Z',
      },
      {
        id: 'vnd-07',
        name: 'Zenith Security Services',
        category: 'Services',
        gstin: '27AABC1576214B6',
        contactPerson: 'Rajesh Verma',
        email: 'ops@zenithsecurity.org',
        phone: '+91 98200 99887',
        address: 'B-14 Okhla Phase 1',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110020',
        country: 'India',
        status: VendorStatus.PENDING,
        notes: 'Background verification docs submitted',
        createdById: 'usr-officer-01',
        createdAt: '2025-02-10T12:00:00.000Z',
        updatedAt: '2025-02-10T12:00:00.000Z',
      },
      {
        id: 'vnd-08',
        name: 'Sterling Chemicals Corp',
        category: 'Chemicals',
        gstin: '27AABC1576214B7',
        contactPerson: 'Nitin Desai',
        email: 'orders@sterlingchem.in',
        phone: '+91 98330 22334',
        address: 'GIDC Estate, Ankleshwar',
        city: 'Bharuch',
        state: 'Gujarat',
        pincode: '393002',
        country: 'India',
        status: VendorStatus.BLOCKED,
        notes: 'Safety clearance audit non-compliance',
        createdById: 'usr-admin-01',
        createdAt: '2025-02-12T16:30:00.000Z',
        updatedAt: '2025-02-15T09:00:00.000Z',
      },
      {
        id: 'vnd-09',
        name: 'Vanguard Electronics',
        category: 'IT',
        gstin: '27AABC1576214B8',
        contactPerson: 'Rohan Sen',
        email: 'support@vanguardelec.com',
        phone: '+91 98300 77889',
        address: 'Salt Lake Sector V',
        city: 'Kolkata',
        state: 'West Bengal',
        pincode: '700091',
        country: 'India',
        status: VendorStatus.ACTIVE,
        notes: 'Microcontrollers and circuit components',
        createdById: 'usr-officer-01',
        createdAt: '2025-02-14T11:00:00.000Z',
        updatedAt: '2025-02-14T11:00:00.000Z',
      },
      {
        id: 'vnd-10',
        name: 'Delta Freight Logistics',
        category: 'Logistics',
        gstin: '27AABC1576214B9',
        contactPerson: 'Amit Roy',
        email: 'cargo@deltafreight.com',
        phone: '+91 98400 11445',
        address: 'Port Trust Area, Rajaji Salai',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        country: 'India',
        status: VendorStatus.ACTIVE,
        notes: 'Coastal and express multimodal cargo carrier',
        createdById: 'usr-officer-01',
        createdAt: '2025-02-16T14:45:00.000Z',
        updatedAt: '2025-02-16T14:45:00.000Z',
      },
      {
        id: 'vnd-11',
        name: 'Bharat Heavy Steels',
        category: 'Constructions',
        gstin: '27AABC1576214C0',
        contactPerson: 'Sunil Rao',
        email: 'info@bharatsteel.co.in',
        phone: '+91 98800 55667',
        address: 'Balanagar Industrial Area',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500037',
        country: 'India',
        status: VendorStatus.ACTIVE,
        notes: 'Structural steel girders and rebar rods',
        createdById: 'usr-officer-01',
        createdAt: '2025-02-18T10:15:00.000Z',
        updatedAt: '2025-02-18T10:15:00.000Z',
      },
      {
        id: 'vnd-12',
        name: 'Prime Facility Management',
        category: 'Services',
        gstin: '27AABC1576214C1',
        contactPerson: 'Pooja Hegde',
        email: 'help@primefacility.in',
        phone: '+91 99000 88990',
        address: 'MG Road, Camp',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
        country: 'India',
        status: VendorStatus.PENDING,
        notes: 'Commercial cleaning contract pending board approval',
        createdById: 'usr-officer-01',
        createdAt: '2025-02-20T13:00:00.000Z',
        updatedAt: '2025-02-20T13:00:00.000Z',
      },
      {
        id: 'vnd-13',
        name: 'Matrix Cloud Systems',
        category: 'IT',
        gstin: '27AABC1576214C2',
        contactPerson: 'Aditya Nair',
        email: 'hello@matrixcloud.dev',
        phone: '+91 98470 33445',
        address: 'Infopark Phase 1, Kakkanad',
        city: 'Kochi',
        state: 'Kerala',
        pincode: '682042',
        country: 'India',
        status: VendorStatus.ACTIVE,
        notes: 'SaaS hosting and managed databases partner',
        createdById: 'usr-officer-01',
        createdAt: '2025-02-22T09:30:00.000Z',
        updatedAt: '2025-02-22T09:30:00.000Z',
      },
      {
        id: 'vnd-14',
        name: 'Titan Industrial Gears',
        category: 'Manufacturing',
        gstin: '27AABC1576214C3',
        contactPerson: 'Harish Babu',
        email: 'gears@titangears.in',
        phone: '+91 98290 66778',
        address: 'Sitapura Industrial Area',
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302022',
        country: 'India',
        status: VendorStatus.ACTIVE,
        notes: 'High torque industrial gear assemblies',
        createdById: 'usr-officer-01',
        createdAt: '2025-02-24T15:20:00.000Z',
        updatedAt: '2025-02-24T15:20:00.000Z',
      },
      {
        id: 'vnd-15',
        name: 'Universal Paper & Boards',
        category: 'Stationery',
        gstin: '27AABC1576214C4',
        contactPerson: 'Manish Gupta',
        email: 'contact@universalpaper.com',
        phone: '+91 94150 99881',
        address: 'Panki Industrial Area',
        city: 'Kanpur',
        state: 'Uttar Pradesh',
        pincode: '208022',
        country: 'India',
        status: VendorStatus.BLOCKED,
        notes: 'Tax invoice non-compliance flag',
        createdById: 'usr-admin-01',
        createdAt: '2025-02-25T11:40:00.000Z',
        updatedAt: '2025-03-01T14:10:00.000Z',
      },
      {
        id: 'vnd-16',
        name: 'Solaris Energy Solutions',
        category: 'Constructions',
        gstin: '27AABC1576214C5',
        contactPerson: 'Arjun Das',
        email: 'sales@solarisenergy.in',
        phone: '+91 98310 44552',
        address: 'Bhubaneswar Industrial Zone',
        city: 'Bhubaneswar',
        state: 'Odisha',
        pincode: '751024',
        country: 'India',
        status: VendorStatus.ACTIVE,
        notes: 'Commercial rooftop solar panel installer',
        createdById: 'usr-officer-01',
        createdAt: '2025-03-02T10:00:00.000Z',
        updatedAt: '2025-03-02T10:00:00.000Z',
      },
      {
        id: 'vnd-17',
        name: 'SecureNet Firewall Technologies',
        category: 'IT',
        gstin: '27AABC1576214C6',
        contactPerson: 'Tanvi Saxena',
        email: 'support@securenet.io',
        phone: '+91 98100 22336',
        address: 'Noida Electronic City, Sector 62',
        city: 'Noida',
        state: 'Uttar Pradesh',
        pincode: '201309',
        country: 'India',
        status: VendorStatus.ACTIVE,
        notes: 'Network boundary protection & SOC hardware',
        createdById: 'usr-officer-01',
        createdAt: '2025-03-05T09:00:00.000Z',
        updatedAt: '2025-03-05T09:00:00.000Z',
      },
      {
        id: 'vnd-18',
        name: 'SwiftMove Couriers',
        category: 'Logistics',
        gstin: '27AABC1576214C7',
        contactPerson: 'Vijay Mallya',
        email: 'dispatch@swiftmove.co',
        phone: '+91 98490 88771',
        address: 'Banjara Hills Road No 12',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500034',
        country: 'India',
        status: VendorStatus.ACTIVE,
        notes: 'Intra-city express documentation logistics',
        createdById: 'usr-officer-01',
        createdAt: '2025-03-08T14:15:00.000Z',
        updatedAt: '2025-03-08T14:15:00.000Z',
      },
      {
        id: 'vnd-19',
        name: 'Precision Castings Ltd',
        category: 'Manufacturing',
        gstin: '27AABC1576214C8',
        contactPerson: 'Girish Kulkarni',
        email: 'sales@precisioncast.in',
        phone: '+91 98230 44558',
        address: 'MIDC Bhosari',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411026',
        country: 'India',
        status: VendorStatus.ACTIVE,
        notes: 'Die-cast metal automotive components',
        createdById: 'usr-officer-01',
        createdAt: '2025-03-10T11:20:00.000Z',
        updatedAt: '2025-03-10T11:20:00.000Z',
      },
      {
        id: 'vnd-20',
        name: 'CleanAir HVAC Systems',
        category: 'Services',
        gstin: '27AABC1576214C9',
        contactPerson: 'Ravi Teja',
        email: 'service@cleanairhvac.com',
        phone: '+91 98480 33221',
        address: 'Madhapur Tech Zone',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500081',
        country: 'India',
        status: VendorStatus.PENDING,
        notes: 'HVAC maintenance contract review',
        createdById: 'usr-officer-01',
        createdAt: '2025-03-12T16:00:00.000Z',
        updatedAt: '2025-03-12T16:00:00.000Z',
      },
      {
        id: 'vnd-21',
        name: 'Alpha Electricals Ltd',
        category: 'Constructions',
        gstin: '27AABC1576214D0',
        contactPerson: 'Praveen Chawla',
        email: 'orders@alphaelectricals.com',
        phone: '+91 98180 55443',
        address: 'Industrial Area Phase 1',
        city: 'Chandigarh',
        state: 'Chandigarh',
        pincode: '160002',
        country: 'India',
        status: VendorStatus.ACTIVE,
        notes: 'Heavy duty commercial transformers & wiring',
        createdById: 'usr-officer-01',
        createdAt: '2025-03-15T10:30:00.000Z',
        updatedAt: '2025-03-15T10:30:00.000Z',
      },
      {
        id: 'vnd-22',
        name: 'AcuPrint Digital Press',
        category: 'Stationery',
        gstin: '27AABC1576214D1',
        contactPerson: 'Bhavna Parekh',
        email: 'print@acuprint.co.in',
        phone: '+91 98210 99882',
        address: 'Lower Parel West',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400013',
        country: 'India',
        status: VendorStatus.ACTIVE,
        notes: 'High volume marketing collateral & corporate stationery',
        createdById: 'usr-officer-01',
        createdAt: '2025-03-18T13:45:00.000Z',
        updatedAt: '2025-03-18T13:45:00.000Z',
      },
      {
        id: 'vnd-23',
        name: 'OmniServe Catering & Hospitality',
        category: 'Services',
        gstin: '27AABC1576214D2',
        contactPerson: 'David Joseph',
        email: 'events@omniserve.in',
        phone: '+91 98460 77665',
        address: 'Panampilly Nagar',
        city: 'Kochi',
        state: 'Kerala',
        pincode: '682036',
        country: 'India',
        status: VendorStatus.ACTIVE,
        notes: 'Corporate cafeteria service provider',
        createdById: 'usr-officer-01',
        createdAt: '2025-03-20T09:15:00.000Z',
        updatedAt: '2025-03-20T09:15:00.000Z',
      },
      {
        id: 'vnd-24',
        name: 'Quantum Data Cables',
        category: 'IT',
        gstin: '27AABC1576214D3',
        contactPerson: 'Naveen Reddy',
        email: 'cables@quantumdata.com',
        phone: '+91 98660 11229',
        address: 'Ecospace Business Park, Bellandur',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560103',
        country: 'India',
        status: VendorStatus.ACTIVE,
        notes: 'Cat6, optical fiber patch cables and racks',
        createdById: 'usr-officer-01',
        createdAt: '2025-03-22T15:00:00.000Z',
        updatedAt: '2025-03-22T15:00:00.000Z',
      },
      {
        id: 'vnd-25',
        name: 'Everest Timber & Plywood',
        category: 'Constructions',
        gstin: '27AABC1576214D4',
        contactPerson: 'Baljit Singh',
        email: 'sales@everestply.in',
        phone: '+91 98150 44332',
        address: 'Focal Point Phase V',
        city: 'Ludhiana',
        state: 'Punjab',
        pincode: '141010',
        country: 'India',
        status: VendorStatus.ACTIVE,
        notes: 'Commercial marine grade fire-retardant plywood',
        createdById: 'usr-officer-01',
        createdAt: '2025-03-25T11:10:00.000Z',
        updatedAt: '2025-03-25T11:10:00.000Z',
      },
      {
        id: 'vnd-26',
        name: 'Navkar Plastics Industries',
        category: 'Manufacturing',
        gstin: '27AABC1576214D5',
        contactPerson: 'Vimal Jain',
        email: 'factory@navkarplastics.com',
        phone: '+91 98250 88776',
        address: 'GIDC Makarpura',
        city: 'Vadodara',
        state: 'Gujarat',
        pincode: '390010',
        country: 'India',
        status: VendorStatus.ACTIVE,
        notes: 'Polymer injection molding and containers',
        createdById: 'usr-officer-01',
        createdAt: '2025-03-28T14:30:00.000Z',
        updatedAt: '2025-03-28T14:30:00.000Z',
      },
      {
        id: 'vnd-27',
        name: 'Metro Line Warehousing',
        category: 'Logistics',
        gstin: '27AABC1576214D6',
        contactPerson: 'Pradeep Pillai',
        email: 'storage@metrowarehouse.in',
        phone: '+91 98410 99883',
        address: 'Sriperumbudur Industrial Corridor',
        city: 'Kanchipuram',
        state: 'Tamil Nadu',
        pincode: '602105',
        country: 'India',
        status: VendorStatus.ACTIVE,
        notes: 'Temperature controlled storage depot',
        createdById: 'usr-officer-01',
        createdAt: '2025-03-30T10:45:00.000Z',
        updatedAt: '2025-03-30T10:45:00.000Z',
      },
      {
        id: 'vnd-28',
        name: 'Synapse Software Solutions',
        category: 'IT',
        gstin: '27AABC1576214D7',
        contactPerson: 'Shalini Murthy',
        email: 'sales@synapsesolutions.net',
        phone: '+91 98860 33441',
        address: 'Electronic City Phase 1',
        city: 'Bengaluru',
        state: 'Karnataka',
        pincode: '560100',
        country: 'India',
        status: VendorStatus.ACTIVE,
        notes: 'ERP integration connectors and API development',
        createdById: 'usr-officer-01',
        createdAt: '2025-04-02T12:00:00.000Z',
        updatedAt: '2025-04-02T12:00:00.000Z',
      },
    ];

    // Seed Purchase Orders matching Screen 3 wireframe:
    // Po1 | Infra | 87000 | Approved
    // Po2 | Tech core | 160000 | Pending
    // Po3 | Officelead Co | 30400 | Draft
    const seedPurchaseOrders: PurchaseOrder[] = [
      {
        id: 'po-01',
        poNumber: 'Po1',
        vendorId: 'vnd-01',
        vendorName: 'Infra Supplies Pvt Ltd',
        amount: 87000,
        status: POStatus.APPROVED,
        orderDate: '2025-05-21T10:00:00.000Z',
        createdAt: '2025-05-21T10:00:00.000Z',
        updatedAt: '2025-05-21T10:00:00.000Z',
      },
      {
        id: 'po-02',
        poNumber: 'Po2',
        vendorId: 'vnd-02',
        vendorName: 'Tech Core LTD',
        amount: 160000,
        status: POStatus.PENDING,
        orderDate: '2025-05-22T11:30:00.000Z',
        createdAt: '2025-05-22T11:30:00.000Z',
        updatedAt: '2025-05-22T11:30:00.000Z',
      },
      {
        id: 'po-03',
        poNumber: 'Po3',
        vendorId: 'vnd-04',
        vendorName: 'Officelead Co',
        amount: 30400,
        status: POStatus.DRAFT,
        orderDate: '2025-05-23T15:45:00.000Z',
        createdAt: '2025-05-23T15:45:00.000Z',
        updatedAt: '2025-05-23T15:45:00.000Z',
      },
    ];

    const initialData: DatabaseSchema = {
      users: seedUsers,
      vendors: seedVendors,
      purchaseOrders: seedPurchaseOrders,
      passwordResetTokens: [],
      auditLogs: [
        {
          id: 'log-01',
          userId: 'usr-admin-01',
          userEmail: 'admin@vendorbridge.com',
          action: 'SYSTEM_INITIALIZED',
          details: 'Initial system configuration and seed records created',
          createdAt: now,
        },
      ],
    };

    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
    return initialData;
  }

  // --- Users API ---
  public async findUserByEmail(email: string): Promise<User | null> {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  public async findUserById(id: string): Promise<User | null> {
    return this.data.users.find((u) => u.id === id) || null;
  }

  public async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>): Promise<User> {
    const now = new Date().toISOString();
    const newUser: User = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...userData,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const index = this.data.users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    this.data.users[index] = {
      ...this.data.users[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.users[index];
  }

  // --- Password Reset Tokens ---
  public async createResetToken(userId: string, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const record: PasswordResetToken = {
      id: `tok-${Date.now()}`,
      token,
      userId,
      expiresAt: expiresAt.toISOString(),
      used: false,
      createdAt: new Date().toISOString(),
    };
    this.data.passwordResetTokens.push(record);
    this.save();
    return record;
  }

  public async findResetToken(token: string): Promise<PasswordResetToken | null> {
    return this.data.passwordResetTokens.find((t) => t.token === token && !t.used) || null;
  }

  public async markTokenUsed(tokenId: string): Promise<void> {
    const token = this.data.passwordResetTokens.find((t) => t.id === tokenId);
    if (token) {
      token.used = true;
      this.save();
    }
  }

  // --- Vendors API ---
  public async findVendors(filters: {
    status?: string;
    category?: string;
    search?: string;
    userId?: string;
  }): Promise<{ vendors: Vendor[]; counts: { all: number; active: number; pending: number; blocked: number } }> {
    let filtered = [...this.data.vendors];

    // If restricted to a specific vendor user
    if (filters.userId) {
      filtered = filtered.filter((v) => v.userId === filters.userId);
    }

    // Counts across all visible vendors
    const counts = {
      all: filtered.length,
      active: filtered.filter((v) => v.status === VendorStatus.ACTIVE).length,
      pending: filtered.filter((v) => v.status === VendorStatus.PENDING).length,
      blocked: filtered.filter((v) => v.status === VendorStatus.BLOCKED).length,
    };

    // Filter by status tab if specified and not 'all'
    if (filters.status && filters.status.toLowerCase() !== 'all') {
      const targetStatus = filters.status.toUpperCase();
      filtered = filtered.filter((v) => v.status === targetStatus);
    }

    // Filter by category
    if (filters.category && filters.category.toLowerCase() !== 'all') {
      filtered = filtered.filter((v) => v.category.toLowerCase() === filters.category!.toLowerCase());
    }

    // Filter by search term
    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.trim().toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.gstin.toLowerCase().includes(q) ||
          v.category.toLowerCase().includes(q) ||
          v.contactPerson.toLowerCase().includes(q) ||
          v.email.toLowerCase().includes(q) ||
          v.phone.toLowerCase().includes(q)
      );
    }

    // Sort by createdAt descending
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { vendors: filtered, counts };
  }

  public async findVendorById(id: string): Promise<Vendor | null> {
    return this.data.vendors.find((v) => v.id === id) || null;
  }

  public async findVendorByGstin(gstin: string): Promise<Vendor | null> {
    return this.data.vendors.find((v) => v.gstin.toUpperCase() === gstin.toUpperCase()) || null;
  }

  public async findVendorByEmail(email: string): Promise<Vendor | null> {
    return this.data.vendors.find((v) => v.email.toLowerCase() === email.toLowerCase()) || null;
  }

  public async createVendor(
    vendorData: Omit<Vendor, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Vendor> {
    const now = new Date().toISOString();
    const newVendor: Vendor = {
      id: `vnd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ...vendorData,
      createdAt: now,
      updatedAt: now,
    };
    this.data.vendors.unshift(newVendor);
    this.save();
    return newVendor;
  }

  public async updateVendor(id: string, updates: Partial<Vendor>): Promise<Vendor | null> {
    const index = this.data.vendors.findIndex((v) => v.id === id);
    if (index === -1) return null;
    this.data.vendors[index] = {
      ...this.data.vendors[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.vendors[index];
  }

  public async deleteVendor(id: string): Promise<boolean> {
    const initialLen = this.data.vendors.length;
    this.data.vendors = this.data.vendors.filter((v) => v.id !== id);
    if (this.data.vendors.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // --- Purchase Orders & Dashboard API ---
  public async getRecentPurchaseOrders(limit = 5): Promise<PurchaseOrder[]> {
    return [...this.data.purchaseOrders]
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .slice(0, limit);
  }

  public async getMonthlySpend(): Promise<number> {
    return this.data.purchaseOrders
      .filter((p) => p.status === POStatus.APPROVED)
      .reduce((sum, p) => sum + p.amount, 0);
  }

  // --- Audit Log ---
  public async logAudit(userId: string | null, userEmail: string | null, action: string, details?: string): Promise<void> {
    const entry: AuditLog = {
      id: `log-${Date.now()}`,
      userId,
      userEmail,
      action,
      details,
      createdAt: new Date().toISOString(),
    };
    this.data.auditLogs.unshift(entry);
    this.save();
  }
}

export const db = new DatabaseStore();
