const products = [
  {
    id: 1,
    name: "Black T-Shirt",
    price: 499,
    image: "https://via.placeholder.com/200"
  },
  {
    id: 2,
    name: "Hoodie",
    price: 999,
    image: "https://via.placeholder.com/200"
  },
  {
    id: 3,
    name: "Jeans",
    price: 1299,
    image: "https://via.placeholder.com/200"
  }
];

let cart = JSON.parse(localStorage.getItem("cart")) || [];

function renderProducts() {
  const container = document.getElementById("products");
  container.innerHTML = "";

  products.forEach(p => {
    container.innerHTML += `
      <div class="card">
        <img src="${p.image}" />
        <h3>${p.name}</h3>
        <p>₹${p.price}</p>
        <button onclick="addToCart(${p.id})">Add to Cart</button>
      </div>
    `;
  });
}

function addToCart(id) {
  cart.push(id);
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCart();
}

function updateCart() {
  document.getElementById("cart-count").innerText = cart.length;
}

renderProducts();
updateCart();