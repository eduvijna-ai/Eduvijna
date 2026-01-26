Place your logo image here:
- Copy C:\\Users\\kanne\\Downloads\\eduvijna.png to this folder as `eduvijna.png`.

After copying, update `src/theme/theme.ts` colors to match your logo's font color (text) and background color (app background).

PowerShell quick copy (run from project root or adjust paths):

Copy-Item -Path 'C:\\Users\\kanne\\Downloads\\eduvijna.png' -Destination '.\\assets\\eduvijna.png'

If your project is at `G:\\Eduvijna AI APP`, use:

Copy-Item -Path 'C:\\Users\\kanne\\Downloads\\eduvijna.png' -Destination 'G:\\Eduvijna AI APP\\eduvijna-mobile\\assets\\eduvijna.png'