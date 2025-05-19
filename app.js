// app.js (Frontend)
const API_URL = 'http://localhost:3000'; // Cambiar a tu URL real

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
  if (!producto) return;

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

  fetch(`${API_URL}/api/crear-preferencia`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`  // ¡CORRECTO! Incluye "Bearer"
    },
    body: JSON.stringify({
      productos: carrito.map(item => ({
        nombre: item.nombre,     // ¡CORRECTO! Enviar "nombre"
        precio: Number(item.precio),
        cantidad: item.cantidad
      }))
    })
  })
    .then(res => res.json())
    .then(data => {
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        alert("No se pudo generar el pago: " + (data.mensaje || "Error desconocido")); // Mejorar el mensaje
      }
    })
    .catch(err => {
      console.error(err);
      alert("Error al crear pago: " + (err.message || "Error desconocido")); // Mejorar el mensaje
    });
}

document.getElementById("verCarrito").addEventListener("click", mostrarCarrito);
document.getElementById("formRegistro").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nombre = document.getElementById("regNombre").value;
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPass").value;

  const res = await fetch(`${API_URL}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, email, password }),
  });

  const data = await res.json();
  alert(data.mensaje || "Error al registrar");
});

document.getElementById("formLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPass").value;

  const res = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (res.ok) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("nombre", data.nombre);
    mostrarUsuario();
  } else {
    alert(data.mensaje || "Error al iniciar sesión");
  }
});

function mostrarUsuario() {
  const nombre = localStorage.getItem("nombre");
  if (nombre) {
    document.getElementById("formularios-usuario").style.display = "none";
    document.getElementById("usuario-logueado").style.display = "block";
    document.getElementById("nombreUsuario").textContent = nombre;
  }
}

function cerrarSesion() {
  localStorage.removeItem("token");
  localStorage.removeItem("nombre");
  document.getElementById("usuario-logueado").style.display = "none";
  document.getElementById("formularios-usuario").style.display = "block";
}

fetch(`${API_URL}/api/productos`)
  .then(res => res.json())
  .then(data => {
    productos = data;
    renderCatalogo();
  });

actualizarCarritoUI();
mostrarUsuario();