# ProjectDepartmentTasks
This project made by Ibrahim Faruk Dogan for Studying

At backend I used nodejs express environment and vscode. For frontend React Native framework and I used vscode

For running the project you need the nodejs, also you need to open the folder named "frontend" with vscode, after that open terminal and write "npm install" while at frontend folder.

For backend you need to open the folder named "backend" with vscode, after that open terminal and write "npm install" while at frontend folder.

After that for starting up the backend, go back to parent folder with docker-compose on and write docker-compose up --build (if it doesn't work you may need virtualization and docker environment to be open and installed)

Also you need a second terminal to start up the frontend. Go to the frondend with "cd frontend" and write "npx expo start --tunnel" (if it doesn't work with saying: "/npx.ps1 cannot be loaded" and needs execution policies you need to write "Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass" firstly and then retry again). Now expo will start up and when it's finished press "w" from your keyboard to open up the project at your web.

If you want to make it work for android then you need ngrok.yml and need to replace the API_URL_ANDROID at the app.config.ts then "npx expo login" to log in your expo account and get a "eas build --profile development --platform android"

But you need to add values for frontend work. So for this you copy "backup.tar" file from "backup" folder and open DBeaver, connect it to postgresql using docker-compose's postgresql url, it's order are= host://name:password@db:portnumber. After conencted and when you see mydb, you right click it and from the menu you click: Tools->Restore and select the Format as "Tar" then select Backup.tar from the list, if it's not seen, then you need to check file extensions on the choose file screen and rather than ".backup", choose " (*)". Then you start restoration. After that you can go to your frontend url for home page at your browser to see the UI.

Lastly When it comes to using the website, you can navigate after you logged on, just press the user profile button and it will open a dropdown menu. You can navigate from there.
