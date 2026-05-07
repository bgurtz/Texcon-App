document.addEventListener("DOMContentLoaded",()=>{
  const inBtn=document.getElementById("clockInBtn");
  const outBtn=document.getElementById("clockOutBtn");

  async function post(url){
    const res=await fetch(url,{ method:"POST" });
    const data=await res.json();
    if(data.ok) location.reload();
  }

  if(inBtn) inBtn.onclick=()=>post("/driver/clock-in");
  if(outBtn) outBtn.onclick=()=>post("/driver/clock-out");
});
