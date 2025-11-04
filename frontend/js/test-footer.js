console.log(' VERIFICACIÓN DE FOOTER');
console.log('========================');

// Verificar contenedor
const footerContainer = document.getElementById('footer-container');
console.log('Footer container:', footerContainer ? ' Existe' : ' No existe');

if (footerContainer) {
    console.log('HTML length:', footerContainer.innerHTML.length);
    console.log('Display:', window.getComputedStyle(footerContainer).display);
    console.log('Visibility:', window.getComputedStyle(footerContainer).visibility);
    
    // Verificar elemento footer
    const footer = footerContainer.querySelector('footer');
    console.log('Footer element:', footer ? ' Existe' : ' No existe');
    
    if (footer) {
        console.log('Footer display:', window.getComputedStyle(footer).display);
        console.log('Footer visibility:', window.getComputedStyle(footer).visibility);
        console.log('Footer opacity:', window.getComputedStyle(footer).opacity);
    }
}
