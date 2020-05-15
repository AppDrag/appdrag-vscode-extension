# appdrag-deployment-helper README
This is the VSCode extension for AppDrag. This extension much like the CLI will help you code your AppDrag projects locally and/or deploy them aswell.

## Features

# All commands start with 'AppDrag :'

### Filesystem
  
   `Filesystem Pull` 		         Pull folder or file from SERVER to LOCAL
   
   `Filesystem Push`	Push folder from LOCAL to SERVER
   

### Database - CloudBackend

   `Database Pull` 					                     Retrieves .sql file of your database from SERVER to LOCAL
   
   `Database Push` 			            Restore the database on SERVER from the LOCAL .sql backup provided
   

### Api - CloudBackend

   `CloudBackend Pull`		        Pull all functions of your CloudBackend to LOCAL
   
   `CloudBackend Pull (Single Function)`		        Pull one function of your CloudBackend to LOCAL
   
   `CloudBackend Push`		        Push all functions from LOCAL to your CloudBackend
   
   `CloudBackend Push (Single Function)`		        Push one functions from LOCAL to your CloudBackend
   
   
### Deployment

   `Deploy Filesystem`		                    Deploys all your non-CloudBackend related files to the specified folder
   
   `Deploy CloudBackend`           		        Deploys all the functions from your CloudBackend to the specified folder

  `Deploy Database`           		        Deploys the database file from your CloudBackend to the specified folder


## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of Appdrag-Vscode-Extension !

**Enjoy!**
