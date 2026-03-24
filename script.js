const products = [
  {
    id: 1,
    name: "Black T-Shirt",
    price: 499,
    image: "https://via.placeholder.com/300"
  },
  {
    id: 2,
    name: "Hoodie",
    price: 999,
    image: "https://via.placeholder.com/300"
  },
  {
    id: 3,
    name: "Jeans",
    price: 1299,
    image: "https://via.placeholder.com/300"
  }
];

let cart = JSON.parse(localStorage.getItem("cart")) || [];

// ================= PRODUCTS =================
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

// ================= ADD TO CART =================
function addToCart(id) {
  const item = cart.find(i => i.id === id);

  if(item){
    item.quantity += 1;
  } else {
    cart.push({ id, quantity: 1 });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  updateCart();

  alert("Added to cart");
}

// ================= CART COUNT =================
function updateCart() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById("cart-count").innerText = count;
}

// ================= VIEW CART =================
function viewCart(){
  let text = "Cart:\n\n";
  let total = 0;

  cart.forEach(item => {
    const product = products.find(p => p.id === item.id);
    const subtotal = product.price * item.quantity;
    total += subtotal;

    text += `${product.name} x ${item.quantity} = ₹${subtotal}\n`;
  });

  text += `\nTotal: ₹${total}`;

  alert(text);
}

// ================= CLEAR CART =================
function clearCart(){
  cart = [];
  localStorage.removeItem("cart");
  updateCart();
  alert("Cart cleared");
}

// INIT
renderProducts();
updateCart();
