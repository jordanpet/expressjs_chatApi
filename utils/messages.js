const fs = require('fs');

const messages = {
  success: "Successful",
  fail: "Fail",
  invalidUserPassword: "Invalid username and password",
  existEmail: "Username and password already exist",
  notExist: "Username and password not exist",
  updatePassword: "User password updated successfully",
  addRestaurant: "Restaurant added successfully",
  updateRestaurant: "Restaurant updated successfully",
  deleteRestaurant: "Restaurant deleted successfully",
  notFound: "Restaurant not found or already deleted.",
  addRestaurantOffer: "Restaurant offer added successfully",
  updateRestaurantOffer: "Restaurant offer updated successfully",
  deleteRestaurantOffer: "Restaurant offer deleted successfully",
  addCategory: "Category added successfully",
  updateCategory: "Category updated successfully",
  deleteCategory: "Category deleted successfully",
  updated: "Updated successfully",
  deleted: "Deleted successfully",
  added: "Added successfully",
  addMenu: "Menu added successfully",
  updateMenu: "Menu updated successfully",
  deleteMenu: "Menu deleted successfully",
  addMenuItem: "Menu added successfully",
  updateMenuItem: "Menu updated successfully",
  deleteMenuItem: "Menu deleted successfully",
  addPortion: "Portion added successfully",
  updatePortion: "Portion updated successfully",
  deletePortion: "Portion deleted successfully",
  addIngredient : "Ingredient added successfully",
  updateIngredient: "Ingredient updated successfully",
  deleteIngredient: "Ingredient deleted successfully"

}; 
module.exports =  messages;