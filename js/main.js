document.addEventListener("DOMContentLoaded", function(){

  const eventLine = document.getElementById("eventLine");
  const eventTitle = document.getElementById("eventTitle");
  const eventSub = document.getElementById("eventSub");
  const dropSound = document.getElementById("dropSound");

  function showEvent(title, subtitle, level="ok"){
    eventTitle.textContent = title;
    eventSub.textContent = subtitle;

    eventLine.classList.remove("flash","ok","bad","warn");
    eventLine.classList.add(level);

    void eventLine.offsetWidth;
    eventLine.classList.add("flash");

    if(dropSound){
      dropSound.currentTime = 0;
      dropSound.play().catch(()=>{});
    }
  }

  // Demo trigger every 8s
  setInterval(()=>{
    showEvent("Magic logs x71", "Submitted successfully", "ok");
  }, 8000);

});
