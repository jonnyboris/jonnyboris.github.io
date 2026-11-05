# jonnyboris.github.io

A really simple in browser text editor. 
I built this so that I could have an easily accessible place to take down a few notes, hopefully it can help you too (Keep it in your bookmarks bar!).

Use **+** to add a blank tab and **×** or a middle-click anywhere on a tab to remove one. Double-click a tab name (or focus it and press **F2**) to edit it inline. Press **Enter** or click away to save the name, or **Escape** to cancel. New tabs start with your local date and time, for example `26-11-05 12:56`. As you type, the title follows the first two words of the note unless you have named the tab yourself. Clearing an automatically named note restores its original date-and-time title.

Notes, tab names, and the selected tab are saved in localStorage in the same browser. Any note saved by the original editor becomes your first tab. Closing the last tab leaves a new blank note.

Open the **☰** menu at the top right to recover a recently closed tab. The last 20 closed tabs are saved locally, newest first, including their names and contents. Click a name to restore it, even after reloading the page.

However be careful, it's set up to save what ever you type into localstorage, and will hang/kill the browser with large bits of text.

https://jonnyboris.github.io/
