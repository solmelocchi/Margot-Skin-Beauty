// BUSCÁ EL FORMULARIO POR SU ID
const formBeauty = document.getElementById("beauty-form");

if (formBeauty) {
  formBeauty.addEventListener("submit", async function(event) {
    event.preventDefault(); // Evita que la página se recargue y se pierda el control
    
    const statusText = document.getElementById("form-status");
    const submitBtn = document.getElementById("submit-btn");
    const formData = new FormData(event.target);

    // Cambiamos el estado del botón para que la clienta sepa que se está procesando
    submitBtn.disabled = true;
    submitBtn.innerText = "Enviando datos...";

    // Enviamos a Formspree usando fetch (por detrás)
    fetch(event.target.action, {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' }
    }).then(response => {
      if (response.ok) {
        // ÉXITO: Mostramos mensaje y redirigimos
        statusText.style.display = "block";
        statusText.style.color = "#3d2c2e"; // Color marrón de tu paleta
        statusText.innerHTML = "<strong>¡Datos recibidos con éxito!</strong><br>Redirigiendo a Mercado Pago para abonar la seña...";
        
        setTimeout(() => {
          // TU LINK DE MERCADO PAGO
          window.location.href = "https://mpago.la/2p9PQxX"; 
        }, 2500);

      } else {
        // ERROR DE SERVIDOR
        statusText.style.display = "block";
        statusText.style.color = "red";
        statusText.innerText = "Ocurrió un error. Por favor, intenta nuevamente.";
        submitBtn.disabled = false;
        submitBtn.innerText = "Enviar datos y pagar →";
      }
    }).catch(error => {
      // ERROR DE CONEXIÓN
      statusText.style.display = "block";
      statusText.style.color = "red";
      statusText.innerText = "Error de conexión. Revisa tu internet.";
      submitBtn.disabled = false;
      submitBtn.innerText = "Enviar datos y pagar →";
    });
  });
}

