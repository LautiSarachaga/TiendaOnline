require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mercadopago = require('mercadopago');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;
const MP_TOKEN = process.env.MP_TOKEN;

// Configurar MercadoPago
mercadopago.configure({ access_token: MP_TOKEN });

// Conexión a MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error al conectar MongoDB:', err));

// Middleware
app.use(cors());
app.use(express.json());

// Modelos
const Usuario = mongoose.model('Usuario', new mongoose.Schema({
  nombre: String,
  email: { type: String, unique: true },
  password: String
}));

const Pedido = mongoose.model('Pedido', new mongoose.Schema({
  usuarioEmail: String,
  productos: Array,
  fecha: { type: Date, default: Date.now }
}));

// Productos simulados
const productos = [
  { id: 1, nombre: "Remera Negra", precio: 3500 },
  { id: 2, nombre: "Pantalón Jeans", precio: 9500 },
  { id: 3, nombre: "Zapatillas Urbanas", precio: 15000 },
  { id: 4, nombre: "Zapatillas Urbanas", precio: 15000 },
  { id: 5, nombre: "Zapatillas Urbanas", precio: 15000 },
  { id: 6, nombre: "Zapatillas Urbanas", precio: 15000 },
  { id: 7, nombre: "Zapatillas Urbanas", precio: 15000 },
  { id: 8, nombre: "Zapatillas Urbanas", precio: 15000 }
];

// Rutas
app.get('/', (req, res) => res.send('Servidor funcionando correctamente'));
app.get('/api/productos', (req, res) => res.json(productos));

// Registro
app.post('/api/register', async (req, res) => {
  const { nombre, email, password } = req.body;
  if (!nombre || !email || !password) return res.status(400).json({ mensaje: 'Faltan campos requeridos' });

  const existente = await Usuario.findOne({ email });
  if (existente) return res.status(400).json({ mensaje: 'Email ya registrado' });

  const hash = await bcrypt.hash(password, 10);
  await new Usuario({ nombre, email, password: hash }).save();

  res.status(201).json({ mensaje: 'Usuario registrado con éxito' });
});

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const usuario = await Usuario.findOne({ email });
  if (!usuario || !(await bcrypt.compare(password, usuario.password))) {
    return res.status(400).json({ mensaje: 'Credenciales inválidas' });
  }

  const token = jwt.sign({ email: usuario.email, nombre: usuario.nombre }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ mensaje: 'Login exitoso', token, nombre: usuario.nombre });
});

// Pedido
app.post('/api/pedido', async (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ mensaje: 'Token faltante' });

  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
    const { productos } = req.body;
    if (!productos || !Array.isArray(productos)) return res.status(400).json({ mensaje: 'Carrito inválido' });

    await new Pedido({ usuarioEmail: decoded.email, productos }).save();
    res.status(201).json({ mensaje: 'Pedido guardado con éxito' });
  } catch {
    res.status(401).json({ mensaje: 'Token inválido' });
  }
});

// Crear preferencia MercadoPago
app.post('/api/crear-preferencia', async (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ mensaje: "Token faltante" });

  try {
    jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
  } catch {
    return res.status(401).json({ mensaje: "Token inválido" });
  }

  const { productos } = req.body;
  if (!productos || !Array.isArray(productos)) {
    return res.status(400).json({ mensaje: "Carrito inválido" });
  }

  const items = productos.map(p => ({
    title: p.nombre,
    unit_price: Number(p.precio),
    quantity: p.cantidad || 1,
    currency_id: 'ARS'
  }));

  try {
    const preference = await mercadopago.preferences.create({
      items,
      back_urls: {
        success: "https://tu-front.vercel.app/success",
        failure: "https://tu-front.vercel.app/failure",
        pending: "https://tu-front.vercel.app/pending"
      },
      auto_return: "approved"
    });

    res.json({ init_point: preference.body.init_point });
  } catch (err) {
    console.error("💥 Error al crear preferencia:", err);
    res.status(500).json({ mensaje: "Error al crear preferencia de pago" });
  }
});

app.listen(PORT, () => console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`));
