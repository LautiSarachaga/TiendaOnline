// app.js

let productos = [];
let carrito = [];
let usuarioEmail = null;

// ========== FUNCIONES DE CARRITO ==========

function obtenerClaveCarrito() {
  return `carrito_${usuarioEmail}`;
}

function cargarCarrito() {
  if (usuarioEmail) {
    const guardado = localStorage.getItem(obtenerClaveCarrito());
    carrito = guardado ? JSON.parse(guardado) : [];
  } else {
    carrito = [];
  }
}

function guardarCarrito() {
  if (usuarioEmail) {
    localStorage.setItem(obtenerClaveCarrito(), JSON.stringify(carrito));
  }
}

function vaciarCarrito() {
  carrito = [];
  guardarCarrito();
  actualizarCarritoUI();
}

function quitarUnidad(id) {
  const item = carrito.find(p => p.id === id);
  if (item) {
    item.cantidad -= 1;
    if (item.cantidad <= 0) {
      carrito = carrito.filter(p => p.id !== id);
    }
    guardarCarrito();
    actualizarCarritoUI();
  }
}

// ========== RENDER Y EVENTOS ==========

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
    div.innerHTML = `
      ${item.nombre} x${item.cantidad} - $${item.precio * item.cantidad}
      <button onclick="quitarUnidad(${item.id})">-</button>
    `;
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

  if (!token || !usuarioEmail) {
    alert("Debés iniciar sesión para finalizar la compra.");
    return;
  }

  fetch("https://tiendaonline-87q2.onrender.com/api/crear-preferencia", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productos: carrito })
  })
    .then(res => res.json())
    .then(data => {
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        alert("No se pudo generar el pago");
      }
    })
    .catch(err => {
      console.error(err);
      alert("Error al crear pago");
    });
}

function detectarUsuario() {
  usuarioEmail = localStorage.getItem("email");
  cargarCarrito();
  actualizarCarritoUI();
}

// ========== INICIO ==========

document.getElementById("verCarrito").addEventListener("click", mostrarCarrito);
document.getElementById("vaciarCarrito").addEventListener("click", () => {
  vaciarCarrito();
  cerrarCarrito();
});

fetch("https://tiendaonline-87q2.onrender.com/api/productos")
  .then(response => response.json())
  .then(data => {
    productos = data;
    renderCatalogo();
  })
  .catch(err => console.error("Error cargando productos:", err));

detectarUsuario();
