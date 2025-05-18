// app.js

let productos = [];
let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

function renderCatalogo() {
  const contenedor = document.getElementById("catalogo");
  contenedor.innerHTML = "";

  productos.forEach(prod => {
    const div = document.createElement("div");
    div.classList.add("producto");
    div.innerHTML = `
      <h3>${prod.nombre}</h3>
      <p>$${prod.precio}</p>
      <button onclick="agregarAlCarrito(${prod.id})">Agregar</button>
    `;
    contenedor.appendChild(div);
  });
}

function agregarAlCarrito(id) {
  const producto = productos.find(p => p.id === id);
  const existente = carrito.find(p => p.id === id);
  if (existente) {
    existente.cantidad += 1;
  } else {
    carrito.push({ ...producto, cantidad: 1 });
  }
  guardarCarrito();
  actualizarCarritoUI();
}

function guardarCarrito() {
  localStorage.setItem("carrito", JSON.stringify(carrito));
}

function actualizarCarritoUI() {
  const cantidad = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  document.getElementById("carritoCantidad").textContent = cantidad;
}

function mostrarCarrito() {
  const modal = document.getElementById("carritoModal");
  const contenedor = document.getElementById("carritoItems");
  contenedor.innerHTML = "";
  let total = 0;

  carrito.forEach(item => {
    const div = document.createElement("div");
    div.textContent = `${item.nombre} x${item.cantidad} - $${item.precio * item.cantidad}`;
    contenedor.appendChild(div);
    total += item.precio * item.cantidad;
  });

  document.getElementById("totalCarrito").textContent = total;
  modal.classList.remove("oculto");
}

function cerrarCarrito() {
  document.getElementById("carritoModal").classList.add("oculto");
}

function finalizarCompra() {
  const token = localStorage.getItem("token");
  const nombre = localStorage.getItem("nombre");

  if (!token || !nombre) {
    alert("Debés iniciar sesión para finalizar la compra.");
    return;
  }

  fetch("http://localhost:3000/api/crear-preferencia", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productos: carrito })
  })
    .then(res => res.json())
    .then(data => {
      if (data.init_point) {
        window.location.href = data.init_point; // 🔁 redirigir al checkout
      } else {
        alert("No se pudo generar el pago");
      }
    })
    .catch(err => {
      console.error(err);
      alert("Error al crear pago");
    });
}

document.getElementById("verCarrito").addEventListener("click", mostrarCarrito);

// 🔁 Obtener productos del backend y mostrarlos
fetch("http://localhost:3000/api/productos")
  .then(response => response.json())
  .then(data => {
    productos = data;
    renderCatalogo();
  })
  .catch(err => console.error("Error cargando productos:", err));

actualizarCarritoUI();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Simularemos usuarios con un array en memoria (o archivo después)
const usuarios = [];

// Secreto para firmar el token (en real, guardalo en .env)
const JWT_SECRET = 'claveultrasecreta123';

// REGISTRO
app.post('/api/register', async (req, res) => {
  const { nombre, email, password } = req.body;

  const yaExiste = usuarios.find(u => u.email === email);
  if (yaExiste) return res.status(400).json({ mensaje: 'Email ya registrado' });

  const hash = await bcrypt.hash(password, 10);
  const nuevoUsuario = { nombre, email, password: hash };
  usuarios.push(nuevoUsuario);

  res.status(201).json({ mensaje: 'Usuario registrado con éxito' });
});

// LOGIN
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  const usuario = usuarios.find(u => u.email === email);
  if (!usuario) return res.status(400).json({ mensaje: 'Credenciales inválidas' });

  const valid = await bcrypt.compare(password, usuario.password);
  if (!valid) return res.status(400).json({ mensaje: 'Credenciales inválidas' });

  const token = jwt.sign({ email: usuario.email, nombre: usuario.nombre }, JWT_SECRET, { expiresIn: '1h' });

  res.json({ mensaje: 'Login exitoso', token, nombre: usuario.nombre });
});
