# todo list

## UI

- Delete option for pieces
- Delete option for cabinets
- Sheet spacing should be nicer, keep it on screen

## Function

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
