# Category
## create(username, { label, parentId })
## get(username, id)
## getAll(username)
getCategoryTrees(username)
getCategorySubTree(id)
getRootIds(username)
getDefaultCategoryIds(username) - tests
getChildren(id) - tests (remove)
## update(username, id, data)
## remove(username, id) 

# Ingredient (No crud)
create(recipeId, ingredientData)
get(id) - tests (remove !!!???)
getAll(recipeId) - tests (remove !!!???)
_getCount(recipeId)
updateAmounts(ingredients)
remove(id)

# Instruction (No crud)
create(recipeId, data)
_createSingle(recipeId, step, order)
_createMultiple(recipeId, steps, startingOrder)
_getCount
update
_removeOrCreate
remove

# Recipe
create(username, { title, servings, sourceUrl, sourceName, image, ingredients,
  instructions, cuisines, diets, courses, occasions }) 
get(username, recipeId)
getAll(username, { query, orderBy, isAsc }={})
_getSqlToFilter(fieldsToSelect)
_getOrderByClause(orderBy=[], isAsc)
toggleFavorite(username, recipeId)
_getInstructions
_getIngredients
_getCategories
update(username, recipeId, data)
remove(recipeId)
addCategory(recipeId, categoryId)
_createAndAddCategories(recipeId, username, labels, parentId)
_addCategories(recipeId, categoryIds)

# Unit
create({ metricUnit, usUnit })
createBatch(unitValues)
_filterPreExisting(units)
getId({ metricUnit, usUnit })
getIds(units)