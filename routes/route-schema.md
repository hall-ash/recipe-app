### ROUTES SCHEMA

#### Recipe routes
- GET     /users/:username/recipes                - gets all user recipes *filter by
- GET     /users/:username/recipes/:id            - gets user recipe 
- POST    /users/:username/recipes                - creates recipe
- PATCH    /users/:username/recipes/favorites/:id  - adds recipe to favorites
- PATCH   /users/:username/recipes/:id            - updates recipe
- DELETE  /users/:username/recipes/:id            - deletes recipe

*filter by: title, favorites, edited_at, created_at, ingredients, categories

#### Category routes
- GET     /categories                - gets all categories
- GET     /categories/:id            - gets category (when needed???)
- POST    /categories                - creates category
- PATCH   /categories/:id            - updates category
- DELETE  /categories/:id            - deletes category

