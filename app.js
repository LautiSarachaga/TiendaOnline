// app.js

let productos = [];
const email = localStorage.getItem("email");
let carrito = [];

if (email) {
  carrito = JSON.parse(localStorage.getItem(`carrito_${email}`)) || [];
}

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

function quitarDelCarrito(id) {
  const index = carrito.findIndex(p => p.id === id);
  if (index !== -1) {
    if (carrito[index].cantidad > 1) {
      carrito[index].cantidad--;
    } else {
      carrito.splice(index, 1);
    }
    guardarCarrito();
    actualizarCarritoUI();
    mostrarCarrito();
  }
}

function guardarCarrito() {
  const email = localStorage.getItem("email");
  if (email) {
    localStorage.setItem(`carrito_${email}`, JSON.stringify(carrito));
  }
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
      <button onclick="quitarDelCarrito(${item.id})">➖</button>
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

function vaciarCarrito() {
  const email = localStorage.getItem("email");
  if (email) {
    localStorage.removeItem(`carrito_${email}`);
  }
  carrito = [];
  actualizarCarritoUI();
  cerrarCarrito();
  alert("Carrito vaciado.");
}

function finalizarCompra() {
  const token = localStorage.getItem("token");
  const nombre = localStorage.getItem("nombre");
  const email = localStorage.getItem("email");

  if (!token || !nombre) {
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
        carrito = [];
        guardarCarrito();
        actualizarCarritoUI();
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

document.getElementById("verCarrito").addEventListener("click", mostrarCarrito);

// 🔁 Obtener productos del backend y mostrarlos
fetch("https://tiendaonline-87q2.onrender.com/api/productos")
  .then(response => response.json())
  .then(data => {
    productos = data;
    renderCatalogo();
  })
  .catch(err => console.error("Error cargando productos:", err));

actualizarCarritoUI();
