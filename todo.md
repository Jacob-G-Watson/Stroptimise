# todo list

## UI

- Sheet spacing should be nicer, keep it on screen
- Easy way to put in a poly
  - SVG click/drag editor (no deps): user clicks to add vertices on an SVG canvas, drag vertices to adjust, buttons for undo/clear/finish. Simple and no extra libs.
  - User enters in json but it is immediately shown on screen what that does
  - Show measurements on screen
  - fix up how it hangs out the side

## Function

- Make it at least somewhat secure
- Export data as a pdf
- Export data as a csv and json
- Load data in from a csv or json modified export

## Optimiser

- Should run [Any time a cabinet is modified (pieces added, edited or removed) or a cabinet is added to a job]. It iterate through all packing modes starting with the quickest and saving to the db a placement group ever time it finishes a run.
- Prioritise not rotating where it does not increase sheets
- Once a minimum number of sheets is reached then prioritise moving all of the empty space to one area
- Current optimising is bad it wastes a lot of space

- JobLayoutViewer when opened should load a placement group from the database where one exists.
when this page first loads if there exists a placement group in the db I want to use that one. Only if there have been no changes to the cabinets or pieces of the job since the placement group was calculated.
- Any time a cabinet is modified (pieces added, edited or removed) or a cabinet is added to a job, flag the placement group as old new db field
could do a delete instead

## CICD

- Get it hosted
- Have it build off one command
- Move to a proper DB
- Have an update of the main branch push to prod

## Tech Debt

- app.py should be sorted better into different functions. Could look at different files
- Testing framework




Should run [Any time a cabinet is modified (pieces added, edited or removed) or a cabinet is added to a job]. It iterate through all packing modes starting with the quickest and saving to the db a placement group ever time it finishes a run.
2.

I want the proccess to be async the user should not wait for optimiser to run when they add a peice

as soon as a new edit add or delete is made stop the current optmisation and make a new one

when opening the joblayoutviewer I want to display the most recently calculated placement group to the user

add a debug print into the server so that ever time it starts and ends a run it is put in the terminal

Do not modify my db schema

Do not ask me to interact






Add a button next to compute layout in job layout viewer that will export placement group downloaded
Make use of the backend to do it and keep the front end calculation free.
I want it to display as a pdf
