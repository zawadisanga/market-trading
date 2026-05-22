const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Ensure directories exist
const dataDir = path.join(__dirname, 'data');
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Database file path
const DB_PATH = path.join(dataDir, 'database.json');

// ============= CURRENCY CONFIGURATION =============
const currencies = {
  // Africa
  TZS: { code: 'TZS', symbol: 'TSh', name: 'Tanzania Shilling', country: 'Tanzania', flag: '🇹🇿', rate: 1, decimal: 0, region: 'africa' },
  KES: { code: 'KES', symbol: 'KSh', name: 'Kenya Shilling', country: 'Kenya', flag: '🇰🇪', rate: 0.018, decimal: 0, region: 'africa' },
  UGX: { code: 'UGX', symbol: 'USh', name: 'Uganda Shilling', country: 'Uganda', flag: '🇺🇬', rate: 1.4, decimal: 0, region: 'africa' },
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', country: 'Nigeria', flag: '🇳🇬', rate: 0.28, decimal: 0, region: 'africa' },
  GHS: { code: 'GHS', symbol: '₵', name: 'Ghana Cedi', country: 'Ghana', flag: '🇬🇭', rate: 0.0052, decimal: 2, region: 'africa' },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', country: 'South Africa', flag: '🇿🇦', rate: 0.0068, decimal: 2, region: 'africa' },
  XAF: { code: 'XAF', symbol: 'FCFA', name: 'CFA Franc', country: 'Central Africa', flag: '🌍', rate: 0.23, decimal: 0, region: 'africa' },
  MAD: { code: 'MAD', symbol: 'DH', name: 'Moroccan Dirham', country: 'Morocco', flag: '🇲🇦', rate: 0.0038, decimal: 2, region: 'africa' },
  EGP: { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', country: 'Egypt', flag: '🇪🇬', rate: 0.012, decimal: 2, region: 'africa' },
  
  // Asia
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', country: 'India', flag: '🇮🇳', rate: 0.031, decimal: 2, region: 'asia' },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', country: 'China', flag: '🇨🇳', rate: 0.0027, decimal: 2, region: 'asia' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', country: 'Japan', flag: '🇯🇵', rate: 0.053, decimal: 0, region: 'asia' },
  KRW: { code: 'KRW', symbol: '₩', name: 'South Korean Won', country: 'South Korea', flag: '🇰🇷', rate: 0.00052, decimal: 0, region: 'asia' },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', country: 'Singapore', flag: '🇸🇬', rate: 0.00028, decimal: 2, region: 'asia' },
  MYR: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', country: 'Malaysia', flag: '🇲🇾', rate: 0.0017, decimal: 2, region: 'asia' },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht', country: 'Thailand', flag: '🇹🇭', rate: 0.013, decimal: 2, region: 'asia' },
  VND: { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', country: 'Vietnam', flag: '🇻🇳', rate: 9.2, decimal: 0, region: 'asia' },
  PKR: { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', country: 'Pakistan', flag: '🇵🇰', rate: 0.11, decimal: 0, region: 'asia' },
  BDT: { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', country: 'Bangladesh', flag: '🇧🇩', rate: 0.041, decimal: 0, region: 'asia' },
  
  // Europe
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', country: 'Europe', flag: '🇪🇺', rate: 0.00035, decimal: 2, region: 'europe' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', country: 'United Kingdom', flag: '🇬🇧', rate: 0.00030, decimal: 2, region: 'europe' },
  CHF: { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', country: 'Switzerland', flag: '🇨🇭', rate: 0.00033, decimal: 2, region: 'europe' },
  SEK: { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', country: 'Sweden', flag: '🇸🇪', rate: 0.0039, decimal: 2, region: 'europe' },
  NOK: { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', country: 'Norway', flag: '🇳🇴', rate: 0.0038, decimal: 2, region: 'europe' },
  DKK: { code: 'DKK', symbol: 'kr', name: 'Danish Krone', country: 'Denmark', flag: '🇩🇰', rate: 0.0026, decimal: 2, region: 'europe' },
  PLN: { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', country: 'Poland', flag: '🇵🇱', rate: 0.0016, decimal: 2, region: 'europe' },
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble', country: 'Russia', flag: '🇷🇺', rate: 0.029, decimal: 2, region: 'europe' },
  TRY: { code: 'TRY', symbol: '₺', name: 'Turkish Lira', country: 'Turkey', flag: '🇹🇷', rate: 0.0072, decimal: 2, region: 'europe' },
  
  // North America
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', country: 'United States', flag: '🇺🇸', rate: 0.00038, decimal: 2, region: 'north_america' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', country: 'Canada', flag: '🇨🇦', rate: 0.00051, decimal: 2, region: 'north_america' },
  MXN: { code: 'MXN', symbol: '$', name: 'Mexican Peso', country: 'Mexico', flag: '🇲🇽', rate: 0.0065, decimal: 2, region: 'north_america' },
  
  // South America
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', country: 'Brazil', flag: '🇧🇷', rate: 0.0019, decimal: 2, region: 'south_america' },
  ARS: { code: 'ARS', symbol: '$', name: 'Argentine Peso', country: 'Argentina', flag: '🇦🇷', rate: 0.089, decimal: 2, region: 'south_america' },
  CLP: { code: 'CLP', symbol: '$', name: 'Chilean Peso', country: 'Chile', flag: '🇨🇱', rate: 0.31, decimal: 0, region: 'south_america' },
  COP: { code: 'COP', symbol: '$', name: 'Colombian Peso', country: 'Colombia', flag: '🇨🇴', rate: 1.5, decimal: 0, region: 'south_america' },
  PEN: { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', country: 'Peru', flag: '🇵🇪', rate: 0.0014, decimal: 2, region: 'south_america' },
  
  // Oceania
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', country: 'Australia', flag: '🇦🇺', rate: 0.00057, decimal: 2, region: 'oceania' },
  NZD: { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', country: 'New Zealand', flag: '🇳🇿', rate: 0.00061, decimal: 2, region: 'oceania' },
  FJD: { code: 'FJD', symbol: 'FJ$', name: 'Fijian Dollar', country: 'Fiji', flag: '🇫🇯', rate: 0.00084, decimal: 2, region: 'oceania' },
  
  // Middle East
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', country: 'UAE', flag: '🇦🇪', rate: 0.0014, decimal: 2, region: 'middle_east' },
  SAR: { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', country: 'Saudi Arabia', flag: '🇸🇦', rate: 0.00143, decimal: 2, region: 'middle_east' },
  QAR: { code: 'QAR', symbol: '﷼', name: 'Qatari Riyal', country: 'Qatar', flag: '🇶🇦', rate: 0.00138, decimal: 2, region: 'middle_east' },
  OMR: { code: 'OMR', symbol: '﷼', name: 'Omani Rial', country: 'Oman', flag: '🇴🇲', rate: 0.000146, decimal: 3, region: 'middle_east' },
  KWD: { code: 'KWD', symbol: 'د.ك', name: 'Kuwaiti Dinar', country: 'Kuwait', flag: '🇰🇼', rate: 0.000117, decimal: 3, region: 'middle_east' },
  BHD: { code: 'BHD', symbol: 'د.ب', name: 'Bahraini Dinar', country: 'Bahrain', flag: '🇧🇭', rate: 0.000143, decimal: 3, region: 'middle_east' },
  ILS: { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', country: 'Israel', flag: '🇮🇱', rate: 0.0014, decimal: 2, region: 'middle_east' },
};

// ============= DATABASE FUNCTIONS =============
function initDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      users: [],
      products: [],
      messages: [],
      chats: [],
      reviews: [],
      orders: [],
      analytics: { pageViews: 0, totalSales: 0, totalUsers: 0 },
      settings: {
        siteName: 'MarketHub Worldwide',
        siteEmail: 'support@markethub.com',
        maintenanceMode: false,
        defaultCurrency: 'USD'
      }
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
  }
}

function readDB() {
  const data = fs.readFileSync(DB_PATH, 'utf8');
  return JSON.parse(data);
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

initDB();

// ============= MULTER CONFIGURATION =============
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  }
});

// ============= AUTH MIDDLEWARE =============
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

// ============= CURRENCY API ROUTES =============
app.get('/api/currencies', (req, res) => {
  const { region } = req.query;
  let currencyList = Object.values(currencies);
  if (region && region !== 'all') {
    currencyList = currencyList.filter(c => c.region === region);
  }
  res.json({
    currencies: currencyList,
    default: 'USD',
    regions: ['africa', 'asia', 'europe', 'north_america', 'south_america', 'oceania', 'middle_east']
  });
});

app.get('/api/currencies/regions', (req, res) => {
  const regions = {};
  Object.values(currencies).forEach(currency => {
    if (!regions[currency.region]) regions[currency.region] = [];
    regions[currency.region].push(currency);
  });
  res.json(regions);
});

app.post('/api/convert-price', (req, res) => {
  const { amount, fromCurrency, toCurrency } = req.body;
  if (!currencies[fromCurrency] || !currencies[toCurrency]) {
    return res.status(400).json({ error: 'Invalid currency' });
  }
  const amountInTZS = amount / currencies[fromCurrency].rate;
  const convertedAmount = amountInTZS * currencies[toCurrency].rate;
  res.json({
    original: amount,
    from: fromCurrency,
    converted: convertedAmount,
    to: toCurrency,
    symbol: currencies[toCurrency].symbol,
    rate: convertedAmount / amount
  });
});

// ============= USER AUTH ROUTES =============
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, fullName, country, phone } = req.body;
    const db = readDB();
    
    if (db.users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    if (db.users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      username,
      email,
      password: hashedPassword,
      fullName,
      country: country || 'Tanzania',
      phone: phone || '',
      currency: 'USD',
      createdAt: new Date().toISOString(),
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`,
      role: 'user',
      verified: false,
      rating: 0,
      totalSales: 0,
      joinedDate: new Date().toISOString()
    };
    
    db.users.push(newUser);
    db.analytics.totalUsers = db.users.length;
    writeDB(db);
    
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.json({ token, user: { id: newUser.id, username: newUser.username, email: newUser.email, fullName: newUser.fullName, avatar: newUser.avatar, role: newUser.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });
    
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName, avatar: user.avatar, role: user.role, country: user.country } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/me', authenticateToken, (req, res) => {
  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, username: user.username, email: user.email, fullName: user.fullName, avatar: user.avatar, role: user.role, country: user.country, phone: user.phone, rating: user.rating, totalSales: user.totalSales });
});

app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const { fullName, phone, country, currency, avatar } = req.body;
    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
    
    db.users[userIndex] = { ...db.users[userIndex], fullName: fullName || db.users[userIndex].fullName, phone: phone || db.users[userIndex].phone, country: country || db.users[userIndex].country, currency: currency || db.users[userIndex].currency, avatar: avatar || db.users[userIndex].avatar };
    writeDB(db);
    res.json({ success: true, user: db.users[userIndex] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============= PRODUCT ROUTES =============
app.post('/api/products', authenticateToken, upload.array('images', 10), (req, res) => {
  try {
    const { title, description, price, category, condition, currency, location, brand } = req.body;
    const db = readDB();
    const imageUrls = req.files.map(file => `/uploads/${file.filename}`);
    
    const newProduct = {
      id: uuidv4(),
      sellerId: req.user.id,
      title,
      description,
      price: parseFloat(price),
      currency: currency || 'USD',
      category,
      condition,
      images: imageUrls,
      location: location || '',
      brand: brand || '',
      createdAt: new Date().toISOString(),
      status: 'active',
      views: 0,
      likes: 0
    };
    
    db.products.push(newProduct);
    writeDB(db);
    res.json(newProduct);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/products', (req, res) => {
  const db = readDB();
  const { category, search, currency = 'USD', minPrice, maxPrice, location, sort = 'newest' } = req.query;
  
  let products = db.products.filter(p => p.status === 'active');
  
  if (category && category !== 'all') products = products.filter(p => p.category === category);
  if (search) products = products.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase()));
  if (location) products = products.filter(p => p.location === location);
  if (minPrice || maxPrice) {
    products = products.filter(p => {
      const priceInTZS = p.price / currencies[p.currency].rate;
      const targetPrice = priceInTZS * currencies[currency].rate;
      if (minPrice && targetPrice < parseFloat(minPrice)) return false;
      if (maxPrice && targetPrice > parseFloat(maxPrice)) return false;
      return true;
    });
  }
  
  if (sort === 'price_low') products.sort((a, b) => {
    const aPrice = (a.price / currencies[a.currency].rate) * currencies[currency].rate;
    const bPrice = (b.price / currencies[b.currency].rate) * currencies[currency].rate;
    return aPrice - bPrice;
  });
  else if (sort === 'price_high') products.sort((a, b) => {
    const aPrice = (a.price / currencies[a.currency].rate) * currencies[currency].rate;
    const bPrice = (b.price / currencies[b.currency].rate) * currencies[currency].rate;
    return bPrice - aPrice;
  });
  else if (sort === 'newest') products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  else if (sort === 'popular') products.sort((a, b) => b.views - a.views);
  
  products = products.map(product => {
    const seller = db.users.find(u => u.id === product.sellerId);
    const priceInTZS = product.price / currencies[product.currency].rate;
    const convertedPrice = priceInTZS * currencies[currency].rate;
    
    return {
      ...product,
      originalPrice: product.price,
      originalCurrency: product.currency,
      price: convertedPrice,
      displayCurrency: currency,
      currencySymbol: currencies[currency]?.symbol,
      seller: seller ? { id: seller.id, username: seller.username, fullName: seller.fullName, avatar: seller.avatar, rating: seller.rating } : null
    };
  });
  
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const db = readDB();
  const { currency = 'USD' } = req.query;
  const product = db.products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  
  // Increment views
  product.views++;
  writeDB(db);
  
  const seller = db.users.find(u => u.id === product.sellerId);
  const priceInTZS = product.price / currencies[product.currency].rate;
  const convertedPrice = priceInTZS * currencies[currency].rate;
  
  res.json({
    ...product,
    originalPrice: product.price,
    originalCurrency: product.currency,
    price: convertedPrice,
    displayCurrency: currency,
    currencySymbol: currencies[currency]?.symbol,
    seller: seller ? { id: seller.id, username: seller.username, fullName: seller.fullName, avatar: seller.avatar, rating: seller.rating, totalSales: seller.totalSales } : null,
    similarProducts: db.products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4).map(p => ({
      id: p.id,
      title: p.title,
      price: p.price,
      currency: p.currency,
      image: p.images[0]
    }))
  });
});

app.get('/api/my-products', authenticateToken, (req, res) => {
  const db = readDB();
  const products = db.products.filter(p => p.sellerId === req.user.id);
  res.json(products);
});

app.delete('/api/products/:id', authenticateToken, (req, res) => {
  const db = readDB();
  const productIndex = db.products.findIndex(p => p.id === req.params.id);
  if (productIndex === -1) return res.status(404).json({ error: 'Product not found' });
  if (db.products[productIndex].sellerId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });
  
  db.products.splice(productIndex, 1);
  writeDB(db);
  res.json({ message: 'Product deleted successfully' });
});

// ============= CHAT ROUTES =============
app.post('/api/chats', authenticateToken, (req, res) => {
  const { productId, buyerId } = req.body;
  const db = readDB();
  const product = db.products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  
  let chat = db.chats.find(c => c.productId === productId && ((c.buyerId === buyerId && c.sellerId === product.sellerId) || (c.buyerId === product.sellerId && c.sellerId === buyerId)));
  
  if (!chat) {
    chat = {
      id: uuidv4(),
      productId,
      productTitle: product.title,
      productImage: product.images[0],
      sellerId: product.sellerId,
      buyerId: buyerId,
      createdAt: new Date().toISOString(),
      lastMessage: null
    };
    db.chats.push(chat);
    writeDB(db);
  }
  res.json(chat);
});

app.get('/api/chats', authenticateToken, (req, res) => {
  const db = readDB();
  const chats = db.chats.filter(c => c.sellerId === req.user.id || c.buyerId === req.user.id);
  const chatsWithMessages = chats.map(chat => {
    const messages = db.messages.filter(m => m.chatId === chat.id);
    const otherUser = db.users.find(u => u.id === (chat.sellerId === req.user.id ? chat.buyerId : chat.sellerId));
    return {
      ...chat,
      messages: messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
      otherUser: otherUser ? { id: otherUser.id, username: otherUser.username, fullName: otherUser.fullName, avatar: otherUser.avatar } : null,
      unreadCount: messages.filter(m => m.senderId !== req.user.id && !m.read).length
    };
  });
  res.json(chatsWithMessages.sort((a, b) => new Date(b.lastMessage?.timestamp || b.createdAt) - new Date(a.lastMessage?.timestamp || a.createdAt)));
});

app.get('/api/chats/:chatId/messages', authenticateToken, (req, res) => {
  const db = readDB();
  const messages = db.messages.filter(m => m.chatId === req.params.chatId);
  res.json(messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
});

// ============= REVIEW ROUTES =============
app.post('/api/reviews', authenticateToken, (req, res) => {
  const { productId, rating, comment } = req.body;
  const db = readDB();
  
  const review = {
    id: uuidv4(),
    productId,
    userId: req.user.id,
    rating: parseInt(rating),
    comment,
    createdAt: new Date().toISOString(),
    helpful: 0
  };
  
  db.reviews.push(review);
  
  // Update seller rating
  const product = db.products.find(p => p.id === productId);
  if (product) {
    const seller = db.users.find(u => u.id === product.sellerId);
    const sellerReviews = db.reviews.filter(r => {
      const p = db.products.find(pr => pr.id === r.productId);
      return p && p.sellerId === seller.id;
    });
    const avgRating = sellerReviews.reduce((sum, r) => sum + r.rating, 0) / sellerReviews.length;
    seller.rating = avgRating;
  }
  
  writeDB(db);
  res.json(review);
});

app.get('/api/products/:productId/reviews', (req, res) => {
  const db = readDB();
  const reviews = db.reviews.filter(r => r.productId === req.params.productId);
  const reviewsWithUsers = reviews.map(review => {
    const user = db.users.find(u => u.id === review.userId);
    return { ...review, user: user ? { username: user.username, avatar: user.avatar } : null };
  });
  res.json(reviewsWithUsers);
});

// ============= STATS ROUTES =============
app.get('/api/stats', (req, res) => {
  const db = readDB();
  res.json({
    totalProducts: db.products.filter(p => p.status === 'active').length,
    totalUsers: db.users.length,
    totalSales: db.analytics.totalSales,
    totalCategories: [...new Set(db.products.map(p => p.category))].length,
    topProducts: db.products.sort((a, b) => b.views - a.views).slice(0, 5),
    recentProducts: db.products.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10)
  });
});

// ============= SOCKET.IO =============
const connectedUsers = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication required'));
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return next(new Error('Invalid token'));
    socket.user = user;
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.id}`);
  connectedUsers.set(socket.user.id, socket.id);
  socket.join(`user_${socket.user.id}`);
  io.emit('user_status', { userId: socket.user.id, status: 'online' });
  
  socket.on('join_chat', (chatId) => {
    socket.join(`chat_${chatId}`);
  });
  
  socket.on('leave_chat', (chatId) => {
    socket.leave(`chat_${chatId}`);
  });
  
  socket.on('send_message', async (data) => {
    const { chatId, message } = data;
    const db = readDB();
    const chat = db.chats.find(c => c.id === chatId);
    if (!chat) return socket.emit('error', { message: 'Chat not found' });
    if (chat.sellerId !== socket.user.id && chat.buyerId !== socket.user.id) return socket.emit('error', { message: 'Unauthorized' });
    
    const newMessage = {
      id: uuidv4(),
      chatId,
      senderId: socket.user.id,
      message,
      timestamp: new Date().toISOString(),
      read: false
    };
    
    db.messages.push(newMessage);
    chat.lastMessage = { message: message.substring(0, 50), timestamp: newMessage.timestamp, senderId: socket.user.id };
    writeDB(db);
    
    io.to(`chat_${chatId}`).emit('new_message', newMessage);
    const otherUserId = chat.sellerId === socket.user.id ? chat.buyerId : chat.sellerId;
    io.to(`user_${otherUserId}`).emit('message_notification', { chatId, message: newMessage, productTitle: chat.productTitle });
  });
  
  socket.on('typing', (data) => {
    const { chatId, isTyping } = data;
    socket.to(`chat_${chatId}`).emit('user_typing', { userId: socket.user.id, isTyping });
  });
  
  socket.on('mark_read', (chatId) => {
    const db = readDB();
    const messages = db.messages.filter(m => m.chatId === chatId && m.senderId !== socket.user.id && !m.read);
    messages.forEach(message => message.read = true);
    writeDB(db);
    io.to(`chat_${chatId}`).emit('messages_read', { chatId, userId: socket.user.id });
  });
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.id}`);
    connectedUsers.delete(socket.user.id);
    io.emit('user_status', { userId: socket.user.id, status: 'offline' });
  });
});

// ============= SERVE FRONTEND =============
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============= START SERVER =============
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 MarketHub Worldwide Server running on port ${PORT}`);
  console.log(`📍 Visit http://localhost:${PORT}`);
  console.log(`💱 ${Object.keys(currencies).length} currencies supported worldwide`);
});



// Add these to your existing server.js
const crypto = require('crypto');

// Add to your existing code - Password reset tokens
// Add this to your database initialization
function initDB() {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      users: [],
      products: [],
      messages: [],
      chats: [],
      reviews: [],
      orders: [],
      passwordResets: [], // Add this for password reset tokens
      analytics: { pageViews: 0, totalSales: 0, totalUsers: 0 },
      settings: {
        siteName: 'MarketHub Worldwide',
        siteEmail: 'support@markethub.com',
        maintenanceMode: false,
        defaultCurrency: 'USD'
      }
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
  }
}

// Forgot Password - Request reset
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email);
    
    if (!user) {
      // For security, don't reveal if email exists or not
      return res.json({ 
        success: true, 
        message: 'If your email is registered, you will receive a password reset link' 
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date();
    resetExpiry.setHours(resetExpiry.getHours() + 1); // Token expires in 1 hour
    
    // Save reset token
    db.passwordResets = db.passwordResets || [];
    db.passwordResets.push({
      email: user.email,
      token: resetToken,
      expiresAt: resetExpiry.toISOString(),
      createdAt: new Date().toISOString()
    });
    
    // Remove old tokens
    db.passwordResets = db.passwordResets.filter(r => new Date(r.expiresAt) > new Date());
    writeDB(db);
    
    // In production, send email here
    // For demo, return token in response (in production, send via email)
    res.json({
      success: true,
      message: 'Password reset link sent to your email',
      resetToken: resetToken, // Remove this in production, only for demo
      resetUrl: `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}`
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset Password
app.post('/api/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const db = readDB();
    
    // Find valid reset token
    const resetRequest = db.passwordResets?.find(r => 
      r.token === token && new Date(r.expiresAt) > new Date()
    );
    
    if (!resetRequest) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    
    // Find user
    const userIndex = db.users.findIndex(u => u.email === resetRequest.email);
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.users[userIndex].password = hashedPassword;
    
    // Remove used reset tokens
    db.passwordResets = db.passwordResets.filter(r => r.token !== token);
    writeDB(db);
    
    res.json({ success: true, message: 'Password reset successful' });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
