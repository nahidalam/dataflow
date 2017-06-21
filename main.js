function showHide(){
  var btn = document.getElementById("btnSubmit");
  var hiddenitems = document.getElementsByClassName("hidden");
  for (var i =0; i!=hiddenitems.length;i++){
    hiddenitems[i].style.display="inline";
  }
}
