const API_URL = 'https://tiendaonline-87q2.onrender.com';

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
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      productos: carrito.map(item => ({
        nombre: item.nombre,
        precio: item.precio,
        cantidad: item.cantidad
      }))
    })
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

document.getElementById("verCarrito").addEventListener("click", mostrarCarrito);

fetch(`${API_URL}/api/productos`)
  .then(res => res.json())
  .then(data => {
    productos = data;
    renderCatalogo();
  });

actualizarCarritoUI();
