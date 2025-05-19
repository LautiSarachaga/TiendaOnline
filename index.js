// index.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { MercadoPagoConfig, Preference } = require('mercadopago');

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;
const MP_TOKEN = process.env.MP_TOKEN;

// Configurar MercadoPago
const mercadopago = new MercadoPagoConfig({ accessToken: MP_TOKEN });

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI)

.then(() => console.log('✅ Conectado a MongoDB'))
.catch(err => console.error('❌ Error al conectar MongoDB:', err));

// Middlewares
app.use(cors());
app.use(express.json());

// ========================
// Modelos
// ========================
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

// ========================
// Productos simulados
// ========================
const productos = [
  {
    id: 1,
    nombre: "Remera Negra",
    precio: 3500,
    imagen: "https://via.placeholder.com/150",
    descripcion: "Remera básica de algodón color negro"
  },
  {
    id: 2,
    nombre: "Pantalón Jeans",
    precio: 9500,
    imagen: "https://via.placeholder.com/150",
    descripcion: "Jeans clásico azul oscuro"
  },
  {
    id: 3,
    nombre: "Zapatillas Urbanas",
    precio: 15000,
    imagen: "https://via.placeholder.com/150",
    descripcion: "Zapatillas cómodas para uso diario"
  }
];

const Carrito = mongoose.model('Carrito', new mongoose.Schema({
  usuarioEmail: { type: String, required: true },
  productos: [{ 
    id: Number, 
    nombre: String, 
    precio: Number, 
    cantidad: Number 
  }]
}));

<script>
  const API_URL = 'https://tiendaonline-87q2.onrender.com'; // o tu URL real
</script>

// ========================
// Rutas
// ========================

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
  } catch (err) {
    console.error(err);
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
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensaje: 'Error al iniciar sesión' });
  }
});

// Obtener carrito del usuario
app.get('/api/carrito', async (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ mensaje: 'Token faltante' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const carrito = await Carrito.findOne({ usuarioEmail: decoded.email }) || { productos: [] };
    res.json(carrito.productos);
  } catch (error) {
    res.status(401).json({ mensaje: 'Token inválido' });
  }
});

// Actualizar carrito del usuario
app.post('/api/carrito', async (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ mensaje: 'Token faltante' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { productos } = req.body;

    if (!Array.isArray(productos)) return res.status(400).json({ mensaje: 'Productos inválidos' });

    await Carrito.findOneAndUpdate(
      { usuarioEmail: decoded.email },
      { productos },
      { upsert: true }
    );

    res.json({ mensaje: 'Carrito guardado con éxito' });
  } catch (error) {
    res.status(401).json({ mensaje: 'Token inválido' });
  }
});

// Vaciar carrito
app.delete('/api/carrito', async (req, res) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ mensaje: 'Token faltante' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    await Carrito.deleteOne({ usuarioEmail: decoded.email });
    res.json({ mensaje: 'Carrito eliminado' });
  } catch (error) {
    res.status(401).json({ mensaje: 'Token inválido' });
  }
});


app.post('/api/pedido', async (req, res) => {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ mensaje: 'Token faltante' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
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
    const preference = new Preference(mercadopago);

    const result = await preference.create({
      body: {
        items,
        back_urls: {
          success: "https://tiendaonline-87q2.onrender.com/success",
          failure: "https://tiendaonline-87q2.onrender.com/failure",
          pending: "https://tiendaonline-87q2.onrender.com/pending"
        },
        auto_return: "approved"
      }
    });

    res.json({ init_point: result.init_point });
  } catch (err) {
    console.error("💥 Error al crear preferencia:", err);
    res.status(500).json({ mensaje: "Error al crear preferencia de pago" });
  }
});

// ========================
// Iniciar servidor
// ========================
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});
