var editor = document.getElementById("editor"),
    throttled = _.debounce(save, 1000);

function save() {
    var content =  editor.innerHTML;
    localStorage.setItem("content", content);
}

editor.onkeyup = throttled;

window.onload = function() {
    var content = localStorage.getItem("content");
    if(content) {
        editor.innerHTML = content;
    } else {
        editor.innerHTML = "This is a simple text editor, it automatically saves your text, locally to your computer. So if you close the tab it should still be here when you get back. ";
    }
    editor.focus();
}