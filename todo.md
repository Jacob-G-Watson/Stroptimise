# todo list

## UI

- Viewer
  - Sheet spacing should be nicer, keep it on screen
  - show measurements on layout preview
  - Zoom on web viewer
  - Click and drag to manually intervene
- Easy way to put in a poly
  - SVG click/drag editor (no deps): user clicks to add vertices on an SVG canvas, drag vertices to adjust, buttons for undo/clear/finish. Simple and no extra libs.
  - User enters in json but it is immediately shown on screen what that does
  - Show measurements on screen
  - fix up how it hangs out the side
- responsive web pages

## Function

- Load data in from a csv or json modified export
- The user does not have to manually select view layout whenever something is change the format is calculated
- Kerf should be stored somewhere, check were it is and make sure that is valid. First thought is that it should be stored close to a placement set

## Optimiser

- Should run [Any time a cabinet is modified (pieces added, edited or removed) or a cabinet is added to a job]. It iterate through all packing modes starting with the quickest and saving to the db a placement group ever time it finishes a run.
- Prioritise not rotating where it does not increase sheets
- Once a minimum number of sheets is reached then prioritise moving all of the empty space to one area
- Current optimising is bad it wastes a lot of space

- Does L get filled or is it bounding boxed

- JobLayoutViewer when opened should load a placement group from the database where one exists.
when this page first loads if there exists a placement group in the db I want to use that one. Only if there have been no changes to the cabinets or pieces of the job since the placement group was calculated.
- Any time a cabinet is modified (pieces added, edited or removed) or a cabinet is added to a job, flag the placement group as old new db field
could do a delete instead

## CICD

## Tech Debt
