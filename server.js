const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://127.0.0.1:27017/clothing_store');

// ================= MODELS =================
const User = mongoose.model('User', {
  email: String,
  password: String
});

const Product = mongoose.model('Product', {
  name: String,
  price: Number,
  image: String
});

// ================= AUTH =================
app.post('/register', async (req, res) => {
  const hashed = await bcrypt.hash(req.body.password, 10);
  const user = new User({ email: req.body.email, password: hashed });
  await user.save();
  res.json({ message: 'User registered' });
});

app.post('/login', async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).send('User not found');

  const valid = await bcrypt.compare(req.body.password, user.password);
  if (!valid) return res.status(400).send('Wrong password');

  const token = jwt.sign({ id: user._id }, 'secret');
  res.json({ token });
});

// ================= PRODUCTS =================
app.get('/products', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

app.post('/products', async (req, res) => {
  const product = new Product(req.body);
  await product.save();
  res.json(product);
});

// ================= START =================
app.listen(5000, () => console.log('Server running on port 5000'));