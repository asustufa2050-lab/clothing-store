require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Razorpay = require("razorpay");
const crypto = require("crypto");

const app = express();
app.use(cors({
  origin: "*",
  methods: ["GET","POST","PUT","DELETE"],
  allowedHeaders: ["Content-Type","Authorization"]
}));
app.use(express.json());

// ================= DB =================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("DB Connected"))
  .catch(err => console.log(err));

// ================= MODELS =================
const User = mongoose.model('User', {
  email: String,
  password: String,
  isAdmin: { type: Boolean, default: false }
});

const Product = mongoose.model('Product', {
  name: String,
  price: Number,
  image: String,
  category: String,
  size: String
});

const Cart = mongoose.model('Cart', {
  userId: String,
  items: [{ productId: String, quantity: Number }]
});

const Order = mongoose.model('Order', {
  userId: String,
  items: Array,
  total: Number,
  status: { type: String, default: "pending" },
  paymentId: String
});

// ================= RAZORPAY =================
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY,
  key_secret: process.env.RAZORPAY_SECRET
});

// ================= MIDDLEWARE =================
function auth(req, res, next){
  const token = req.headers.authorization;
  if(!token) return res.status(401).json({ message: "No token" });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
}

function admin(req, res, next){
  if(!req.user.isAdmin){
    return res.status(403).json({ message: "Admin only" });
  }
  next();
}

// ================= AUTH =================
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  const exists = await User.findOne({ email });
  if(exists) return res.status(400).json({ message: "User exists" });

  const hashed = await bcrypt.hash(password, 10);
  await new User({ email, password: hashed }).save();

  res.json({ message: "Registered" });
});

app.post('/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if(!user) return res.status(400).json({ message: "User not found" });

  const valid = await bcrypt.compare(req.body.password, user.password);
  if(!valid) return res.status(400).json({ message: "Wrong password" });

  const token = jwt.sign(
  { id: user._id, isAdmin: user.isAdmin },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);

  res.json({ token, isAdmin: user.isAdmin });
});

// ================= PRODUCTS =================
// GET PRODUCTS (with filters)
app.get('/products', async (req, res) => {
  const { category, size, maxPrice } = req.query;

  let filter = {};

  if(category) filter.category = category;
  if(size) filter.size = size;
  if(maxPrice) filter.price = { $lte: maxPrice };

  const products = await Product.find(filter);
  res.json(products);
});

// ADD PRODUCT (ADMIN ONLY)
app.post('/products', auth, admin, async (req, res) => {
  const { name, price, image } = req.body;

  if(!name || !price || !image){
    return res.status(400).json({ message: "Missing fields" });
  }

  const product = await new Product({ name, price, image }).save();
  res.json(product);
});

// DELETE PRODUCT (ADMIN ONLY)
app.delete('/products/:id', auth, admin, async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});
// ================= CART =================
app.post('/cart', auth, async (req, res) => {
  const { productId, quantity } = req.body;

  let cart = await Cart.findOne({ userId: req.user.id });

  if(!cart) cart = new Cart({ userId: req.user.id, items: [] });

  const i = cart.items.findIndex(x => x.productId === productId);

  if(i > -1) cart.items[i].quantity += quantity;
  else cart.items.push({ productId, quantity });

  await cart.save();
  res.json(cart);
});

app.get('/cart', auth, async (req, res) => {
  res.json(await Cart.findOne({ userId: req.user.id }) || { items: [] });
});

app.delete('/cart/:id', auth, async (req, res) => {
  let cart = await Cart.findOne({ userId: req.user.id });
  if(!cart) return res.json({ items: [] });

  cart.items = cart.items.filter(i => i.productId !== req.params.id);
  await cart.save();

  res.json(cart);
});

// ================= PAYMENT =================
app.post('/create-payment', auth, async (req, res) => {
  const options = {
    amount: req.body.amount * 100,
    currency: "INR"
  };

  const order = await razorpay.orders.create(options);
  res.json(order);
});

app.post('/verify-payment', auth, (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET)
    .update(body)
    .digest("hex");

  if(expected === razorpay_signature){
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false });
  }
});

// ================= ORDER =================
app.post('/order', auth, async (req, res) => {
  const cart = await Cart.findOne({ userId: req.user.id });

  if(!cart || cart.items.length === 0){
    return res.status(400).json({ message: "Cart empty" });
  }

  let total = 0;
  let items = [];

  for (let i of cart.items) {
    const p = await Product.findById(i.productId);
    total += p.price * i.quantity;

    items.push({
      name: p.name,
      price: p.price,
      quantity: i.quantity
    });
  }

  const order = await new Order({
    userId: req.user.id,
    items,
    total
  }).save();

  cart.items = [];
  await cart.save();

  res.json(order);
});

// ================= START =================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log("Server running"));
