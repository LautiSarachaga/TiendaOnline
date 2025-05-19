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

// Configurar MercadoPago con el token de entorno
mercadopago.access_token = MP_TOKEN;

// Conexión a MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ Conectado a MongoDB'))
  .catch(err => console.error('❌ Error al conectar MongoDB:', err));

// Middleware
app.use(cors());
app.use(express.json());

// Modelo de Usuario
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

// Catálogo de productos (simulado)
const productos = [
  { id: 1, nombre: "Remera Negra", precio: 3500, imagen: "https://via.placeholder.com/150", descripcion: "Remera básica de algodón color negro" },
  { id: 2, nombre: "Pantalón Jeans", precio: 9500, imagen: "https://via.placeholder.com/150", descripcion: "Jeans clásico azul oscuro" },
  { id: 3, nombre: "Zapatillas Urbanas", precio: 15000, imagen: "https://via.placeholder.com/150", descripcion: "Zapatillas cómodas para uso diario" },
  { id: 4, nombre: "Zapatillas Urbanas", precio: 15000, imagen: "https://via.placeholder.com/150", descripcion: "Zapatillas cómodas para uso diario" },
  { id: 5, nombre: "Zapatillas Urbanas", precio: 15000, imagen: "https://via.placeholder.com/150", descripcion: "Zapatillas cómodas para uso diario" },
  { id: 6, nombre: "Zapatillas Urbanas", precio: 15000, imagen: "https://via.placeholder.com/150", descripcion: "Zapatillas cómodas para uso diario" },
  { id: 7, nombre: "Zapatillas Urbanas", precio: 15000, imagen: "https://via.placeholder.com/150", descripcion: "Zapatillas cómodas para uso diario" },
  { id: 8, nombre: "Zapatillas Urbanas", precio: 15000, imagen: "https://via.placeholder.com/150", descripcion: "Zapatillas cómodas para uso diario" }
];

// Rutas
app.get('/', (req, res) => {
  res.send('Servidor funcionando correctamente');
});

app.get('/api/productos', (req, res) => {
  res.json(productos);
});

app.post('/api/register', async (req, res) => {
  const { nombre, email, password } = req.body;
  if (!nombre || !email || !password) {
    return res.status(400).json({ mensaje: 'Faltan campos requeridos' });
  }

  try {
    const existente = await Usuario.findOne({ email });
    if (existente) return res.status(400).json({ mensaje: 'Email ya registrado' });

    const hash = await bcrypt.hash(password, 10);
    const nuevoUsuario = new Usuario({ nombre, email, password: hash });
    await nuevoUsuario.save();

    res.status(201).json({ mensaje: 'Usuario registrado con éxito' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al registrar usuario' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const usuario = await Usuario.findOne({ email });
    if (!usuario) return res.status(400).json({ mensaje: 'Credenciales inválidas' });

    const valid = await bcrypt.compare(password, usuario.password);
    if (!valid) return res.status(400).json({ mensaje: 'Credenciales inválidas' });

    const token = jwt.sign({ email: usuario.email, nombre: usuario.nombre }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ mensaje: 'Login exitoso', token, nombre: usuario.nombre });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al iniciar sesión' });
  }
});

app.post('/api/pedido', async (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ mensaje: 'Token faltante' });

  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
    const usuarioEmail = decoded.email;
    const { productos } = req.body;

    if (!Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ mensaje: 'Carrito vacío o inválido' });
    }

    const nuevoPedido = new Pedido({ usuarioEmail, productos });
    await nuevoPedido.save();

    res.status(201).json({ mensaje: 'Pedido guardado con éxito' });
  } catch (err) {
    console.error(err);
    res.status(401).json({ mensaje: 'Token inválido' });
  }
});

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

  // Mapear productos con las claves que espera MercadoPago
  const items = productos.map(p => ({
    title: p.nombre,  // debe ser "title"
    unit_price: Number(p.precio),
    quantity: p.cantidad || 1,
    currency_id: 'ARS'
  }));

  try {
    const preference = {
      items,
      back_urls: {
        success: "https://tusitio.com/success",
        failure: "https://tusitio.com/failure",
        pending: "https://tusitio.com/pending"
      },
      auto_return: "approved"
    };

    const response = await mercadopago.preferences.create(preference);
    res.json({ init_point: response.body.init_point });
  } catch (err) {
    console.error("💥 Error al crear preferencia:", err);
    res.status(500).json({ mensaje: "Error al crear preferencia de pago" });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
