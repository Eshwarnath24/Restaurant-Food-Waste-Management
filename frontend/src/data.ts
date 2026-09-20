export type TableStatus =
  | "Available"
  | "Occupied"
  | "Reserved"
  | "Ordering"
  | "Food Served"
  | "Checkout Requested"
  | "Analysis in Progress"
  | "Bill Ready";

export interface Table {
  id: string;
  seats: number;
  status: TableStatus;
  orderId?: string;
  reservedFor?: string;
}

export type ItemAvailability = "available" | "sold_out";
export type MealTiming = "all_day" | "evening_only" | "morning_only";

export interface MenuItem {
  id: string;
  name: string;
  category: "Starters" | "Main Course" | "Drinks" | "Desserts";
  price: number;
  servedGrams: number;
  emoji: string;
  description: string;
  availability?: ItemAvailability;
  timing?: MealTiming;
}

export interface OrderItem {
  menuItemId: string;
  quantity: number;
}

export interface WasteResult {
  menuItemId: string;
  servedGrams: number;
  remainingGrams: number;
  consumedGrams: number;
  wastePct: number;
  confidence: number;
}

export interface OrderRecord {
  orderId: string;
  tableId: string;
  items: OrderItem[];
  createdAt: string;
  status: TableStatus;
  wasteResults?: WasteResult[];
  discountPct?: number;
  paymentDone?: boolean;
}

export const MENU: MenuItem[] = [
  { id: "F001", name: "Chicken Biryani", category: "Main Course", price: 250, servedGrams: 500, emoji: "🍛", description: "Slow-cooked basmati rice with tender chicken and aromatic spices.", availability: "available", timing: "all_day" },
  { id: "F002", name: "Mutton Biryani", category: "Main Course", price: 320, servedGrams: 500, emoji: "🍲", description: "Rich slow-cooked mutton with saffron-infused basmati rice.", availability: "available", timing: "evening_only" },
  { id: "F003", name: "Paneer Butter Masala", category: "Main Course", price: 210, servedGrams: 350, emoji: "🧀", description: "Creamy tomato-based curry with soft paneer cubes.", availability: "available", timing: "all_day" },
  { id: "F004", name: "Dal Tadka", category: "Main Course", price: 150, servedGrams: 300, emoji: "🥘", description: "Yellow lentils tempered with cumin and fresh coriander.", availability: "available", timing: "all_day" },
  { id: "F005", name: "Butter Naan", category: "Main Course", price: 50, servedGrams: 80, emoji: "🫓", description: "Soft leavened bread baked in a tandoor with butter.", availability: "available", timing: "all_day" },
  { id: "F006", name: "Chicken 65", category: "Starters", price: 180, servedGrams: 250, emoji: "🍗", description: "Crispy spiced chicken bites with curry leaves and chillies.", availability: "available", timing: "evening_only" },
  { id: "F007", name: "Paneer Tikka", category: "Starters", price: 200, servedGrams: 280, emoji: "🧆", description: "Marinated paneer grilled in tandoor with bell peppers.", availability: "available", timing: "evening_only" },
  { id: "F008", name: "Veg Spring Rolls", category: "Starters", price: 130, servedGrams: 200, emoji: "🥗", description: "Crispy rolls stuffed with seasoned vegetables.", availability: "sold_out", timing: "all_day" },
  { id: "F009", name: "Samosa (2 pcs)", category: "Starters", price: 80, servedGrams: 120, emoji: "🫔", description: "Golden pastry filled with spiced potato and peas.", availability: "available", timing: "morning_only" },
  { id: "F010", name: "Coke", category: "Drinks", price: 60, servedGrams: 300, emoji: "🥤", description: "Chilled Coca-Cola 300ml.", availability: "available", timing: "all_day" },
  { id: "F011", name: "Fresh Lime Soda", category: "Drinks", price: 70, servedGrams: 300, emoji: "🍋", description: "Freshly squeezed lime with sparkling water.", availability: "available", timing: "all_day" },
  { id: "F012", name: "Mango Lassi", category: "Drinks", price: 90, servedGrams: 300, emoji: "🥭", description: "Thick mango-yoghurt drink, chilled.", availability: "available", timing: "all_day" },
  { id: "F013", name: "Mineral Water", category: "Drinks", price: 30, servedGrams: 500, emoji: "💧", description: "500ml sealed mineral water.", availability: "available", timing: "all_day" },
  { id: "F014", name: "Gulab Jamun", category: "Desserts", price: 90, servedGrams: 150, emoji: "🍮", description: "Soft milk-solid dumplings soaked in rose sugar syrup.", availability: "available", timing: "all_day" },
  { id: "F015", name: "Kulfi", category: "Desserts", price: 100, servedGrams: 120, emoji: "🍦", description: "Traditional Indian ice cream with cardamom and pistachio.", availability: "available", timing: "evening_only" },
  { id: "F016", name: "Rasmalai", category: "Desserts", price: 110, servedGrams: 160, emoji: "🥛", description: "Soft cheese patties in sweetened saffron milk.", availability: "sold_out", timing: "evening_only" },
  { id: "F017", name: "Masala Dosa", category: "Main Course", price: 160, servedGrams: 300, emoji: "🥞", description: "Crispy golden fermented crepe stuffed with spiced potato mash & chutneys.", availability: "available", timing: "morning_only" },
  { id: "F018", name: "Madras Filter Coffee", category: "Drinks", price: 50, servedGrams: 180, emoji: "☕", description: "Traditional South Indian chicory filter coffee frothed in a dabarah.", availability: "available", timing: "morning_only" },
  { id: "F019", name: "Tandoori Chicken (Half)", category: "Starters", price: 280, servedGrams: 420, emoji: "🍖", description: "Clay oven roasted chicken in yoghurt, Kashmiri chili & garam masala.", availability: "available", timing: "evening_only" },
  { id: "F020", name: "Butter Chicken", category: "Main Course", price: 270, servedGrams: 400, emoji: "🍗", description: "Smoked shredded tandoori chicken simmered in creamy makhani gravy.", availability: "sold_out", timing: "evening_only" },
  { id: "F021", name: "Garlic Naan", category: "Main Course", price: 70, servedGrams: 90, emoji: "🫓", description: "Tandoor-baked flatbread glazed with roasted garlic butter and herbs.", availability: "sold_out", timing: "all_day" },
  { id: "F022", name: "Mysore Masala Dosa", category: "Main Course", price: 180, servedGrams: 320, emoji: "🥞", description: "Crisp crepe smeared with spicy red chilli-garlic chutney and aloo bhaji.", availability: "sold_out", timing: "morning_only" },
  { id: "F023", name: "Gajar Ka Halwa", category: "Desserts", price: 120, servedGrams: 150, emoji: "🥕", description: "Slow-simmered winter carrot pudding with khoya, cardamom, and roasted cashews.", availability: "sold_out", timing: "evening_only" },
];

export const INITIAL_TABLES: Table[] = [
  { id: "T01", seats: 2, status: "Available" },
  { id: "T02", seats: 4, status: "Occupied", orderId: "ORD-1040" },
  { id: "T03", seats: 6, status: "Reserved", reservedFor: "Sharma Family" },
  { id: "T04", seats: 4, status: "Food Served", orderId: "ORD-1041" },
  { id: "T05", seats: 2, status: "Available" },
  { id: "T06", seats: 8, status: "Available" },
  { id: "T07", seats: 4, status: "Available" },
  { id: "T08", seats: 2, status: "Checkout Requested", orderId: "ORD-1039" },
  { id: "T09", seats: 6, status: "Available" },
  { id: "T10", seats: 4, status: "Available" },
  { id: "T11", seats: 2, status: "Bill Ready", orderId: "ORD-1038" },
  { id: "T12", seats: 4, status: "Available" },
];

export const OWNER_STATS = {
  revenue: 42850,
  orders: 127,
  avgWaste: 8.4,
  discountsGiven: 2430,
  tablesOccupied: 4,
  avgOrderValue: 337,
};

export const DISH_WASTE = [
  { name: "Pasta Alfredo", orders: 70, avgWaste: 24 },
  { name: "Chicken Biryani", orders: 120, avgWaste: 18 },
  { name: "Paneer Curry", orders: 85, avgWaste: 15 },
  { name: "Mutton Biryani", orders: 92, avgWaste: 11 },
  { name: "Dal Tadka", orders: 110, avgWaste: 9 },
  { name: "Veg Fried Rice", orders: 95, avgWaste: 7 },
  { name: "Paneer Tikka", orders: 130, avgWaste: 5 },
  { name: "Chicken 65", orders: 145, avgWaste: 4 },
];

export function getMenuItem(id: string, customMenu?: MenuItem[]): MenuItem {
  if (customMenu) {
    const found = customMenu.find((m) => m.id === id);
    if (found) return found;
  }
  const found = MENU.find((m) => m.id === id);
  if (found) return found;
  return {
    id,
    name: "Special Dish",
    category: "Main Course",
    price: 150,
    servedGrams: 300,
    emoji: "🍽️",
    description: "Chef Special",
    availability: "available",
    timing: "all_day",
  };
}

export function calcSubtotal(items: OrderItem[], customMenu?: MenuItem[]): number {
  return items.reduce((sum, i) => sum + getMenuItem(i.menuItemId, customMenu).price * i.quantity, 0);
}

export function calcDiscount(wastePct: number, subtotal: number): number {
  if (wastePct > 40) return 0;
  if (wastePct > 25) return 2;
  if (wastePct > 15) return 4;
  if (wastePct > 8) return 6;
  if (subtotal > 400) return 10;
  if (subtotal > 200) return 7;
  return 4;
}

export function simulateWasteAnalysis(items: OrderItem[]): WasteResult[] {
  const wasteFactors = [0.06, 0.1, 0.14, 0.18, 0.22];
  return items.map((item) => {
    const mi = getMenuItem(item.menuItemId);
    const factor = wasteFactors[Math.floor(Math.random() * wasteFactors.length)];
    const remainingGrams = Math.round(mi.servedGrams * item.quantity * factor);
    const servedGrams = mi.servedGrams * item.quantity;
    const consumedGrams = servedGrams - remainingGrams;
    const wastePct = Math.round((remainingGrams / servedGrams) * 100);
    const confidence = 85 + Math.floor(Math.random() * 12);
    return { menuItemId: item.menuItemId, servedGrams, remainingGrams, consumedGrams, wastePct, confidence };
  });
}

export const INITIAL_ORDERS: Record<string, OrderRecord> = {
  "ORD-1040": {
    orderId: "ORD-1040",
    tableId: "T02",
    items: [
      { menuItemId: "F002", quantity: 1 }, // Mutton Biryani (320)
      { menuItemId: "F007", quantity: 1 }, // Paneer Tikka (200)
      { menuItemId: "F005", quantity: 2 }, // Butter Naan x 2 (100)
      { menuItemId: "F015", quantity: 1 }, // Kulfi (100)
    ],
    createdAt: "19:42",
    status: "Occupied",
  },
  "ORD-1041": {
    orderId: "ORD-1041",
    tableId: "T04",
    items: [
      { menuItemId: "F001", quantity: 1 }, // Chicken Biryani (250)
      { menuItemId: "F006", quantity: 1 }, // Chicken 65 (180)
      { menuItemId: "F011", quantity: 2 }, // Fresh Lime Soda (140)
    ],
    createdAt: "19:15",
    status: "Food Served",
  },
  "ORD-1039": {
    orderId: "ORD-1039",
    tableId: "T08",
    items: [
      { menuItemId: "F008", quantity: 1 }, // Veg Spring Rolls (130)
      { menuItemId: "F004", quantity: 1 }, // Dal Tadka (150)
      { menuItemId: "F005", quantity: 2 }, // Butter Naan (100)
      { menuItemId: "F010", quantity: 2 }, // Coke (120)
    ],
    createdAt: "18:50",
    status: "Checkout Requested",
  },
  "ORD-1038": {
    orderId: "ORD-1038",
    tableId: "T11",
    items: [
      { menuItemId: "F001", quantity: 2 }, // Chicken Biryani x2 (500)
      { menuItemId: "F006", quantity: 2 }, // Chicken 65 x2 (360)
      { menuItemId: "F012", quantity: 2 }, // Mango Lassi x2 (180)
    ],
    createdAt: "18:30",
    status: "Bill Ready",
    wasteResults: [
      { menuItemId: "F001", servedGrams: 1000, remainingGrams: 50, consumedGrams: 950, wastePct: 5, confidence: 94 },
      { menuItemId: "F006", servedGrams: 500, remainingGrams: 20, consumedGrams: 480, wastePct: 4, confidence: 91 },
      { menuItemId: "F012", servedGrams: 600, remainingGrams: 36, consumedGrams: 564, wastePct: 6, confidence: 96 },
    ],
    discountPct: 10,
    paymentDone: false,
  },
  "ORD-1042": {
    orderId: "ORD-1042",
    tableId: "T04",
    items: [
      { menuItemId: "F001", quantity: 1 },
      { menuItemId: "F006", quantity: 1 },
      { menuItemId: "F010", quantity: 2 },
    ],
    createdAt: "17:40",
    status: "Available",
    wasteResults: [
      { menuItemId: "F001", servedGrams: 500, remainingGrams: 40, consumedGrams: 460, wastePct: 8, confidence: 92 },
      { menuItemId: "F006", servedGrams: 250, remainingGrams: 20, consumedGrams: 230, wastePct: 8, confidence: 90 },
      { menuItemId: "F010", servedGrams: 600, remainingGrams: 48, consumedGrams: 552, wastePct: 8, confidence: 95 },
    ],
    discountPct: 7,
    paymentDone: true,
  },
};
