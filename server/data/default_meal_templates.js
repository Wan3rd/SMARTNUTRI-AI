export const DEFAULT_MEAL_TEMPLATES = [
  {
    id: "default-toddler-weekly",
    name: "Toddler Balanced Plan (1-2 years)",
    description: "Pediatric-approved balanced weekly schedule tailored for toddlers aged 1-2 years (~1000 kcal/day). Soft textures, low sodium, and frequent small portions.",
    target_age: "1-2 years",
    days: {
      "Monday": [
        { meal_type: "Breakfast", recipe_name: "Oatmeal with Mashed Bananas & Milk", calories: 250, protein_g: 8, carbs_g: 40, fats_g: 6 },
        { meal_type: "Snack", recipe_name: "Steamed Carrot Sticks & Yogurt Dip", calories: 120, protein_g: 4, carbs_g: 15, fats_g: 4 },
        { meal_type: "Lunch", recipe_name: "Flaked Salmon with Sweet Potato Mash & Peas", calories: 320, protein_g: 18, carbs_g: 35, fats_g: 12 },
        { meal_type: "Dinner", recipe_name: "Soft Chicken Meatballs with Steamed Rice & Broccoli", calories: 310, protein_g: 20, carbs_g: 30, fats_g: 10 }
      ],
      "Tuesday": [
        { meal_type: "Breakfast", recipe_name: "Scrambled Eggs with Avocado Toast Points", calories: 260, protein_g: 10, carbs_g: 22, fats_g: 14 },
        { meal_type: "Snack", recipe_name: "Whole Milk Yogurt with Pureed Strawberries", calories: 140, protein_g: 6, carbs_g: 18, fats_g: 5 },
        { meal_type: "Lunch", recipe_name: "Cheesy Quinoa with Soft Broccoli Bites", calories: 300, protein_g: 12, carbs_g: 34, fats_g: 11 },
        { meal_type: "Dinner", recipe_name: "Mashed Fish Porridge with Steamed Spinach", calories: 300, protein_g: 16, carbs_g: 38, fats_g: 8 }
      ],
      "Wednesday": [
        { meal_type: "Breakfast", recipe_name: "Baby Pancakes with Applesauce & Milk", calories: 240, protein_g: 7, carbs_g: 38, fats_g: 5 },
        { meal_type: "Snack", recipe_name: "Soft Pear Slices & Milk", calories: 130, protein_g: 4, carbs_g: 22, fats_g: 3 },
        { meal_type: "Lunch", recipe_name: "Tender Turkey Breast with Mashed Pumpkin & Quinoa", calories: 310, protein_g: 19, carbs_g: 33, fats_g: 9 },
        { meal_type: "Dinner", recipe_name: "Soft Beef Stew with Well-Cooked Carrots & Potatoes", calories: 320, protein_g: 22, carbs_g: 28, fats_g: 12 }
      ],
      "Thursday": [
        { meal_type: "Breakfast", recipe_name: "Milk Porridge with Mashed Mango", calories: 250, protein_g: 6, carbs_g: 45, fats_g: 4 },
        { meal_type: "Snack", recipe_name: "Cottage Cheese Scoop with Soft Peach Mash", calories: 120, protein_g: 9, carbs_g: 12, fats_g: 3 },
        { meal_type: "Lunch", recipe_name: "Lentil Mash with Soft White Rice & Zucchini", calories: 310, protein_g: 14, carbs_g: 45, fats_g: 6 },
        { meal_type: "Dinner", recipe_name: "Steamed Cod Fillet with Sweet Potato & Peas", calories: 320, protein_g: 22, carbs_g: 34, fats_g: 8 }
      ],
      "Friday": [
        { meal_type: "Breakfast", recipe_name: "Mashed Avocado & Egg Yolk on Whole Wheat Toast", calories: 260, protein_g: 8, carbs_g: 24, fats_g: 13 },
        { meal_type: "Snack", recipe_name: "Banana Milkshake (No Added Sugar)", calories: 150, protein_g: 5, carbs_g: 22, fats_g: 4 },
        { meal_type: "Lunch", recipe_name: "Shredded Chicken Breast in Broth with Soft Noodles", calories: 290, protein_g: 20, carbs_g: 30, fats_g: 8 },
        { meal_type: "Dinner", recipe_name: "Tofu Mash with Broccoli & Jasmine Brown Rice", calories: 300, protein_g: 12, carbs_g: 36, fats_g: 10 }
      ],
      "Saturday": [
        { meal_type: "Breakfast", recipe_name: "Oats with Mashed Blueberries & Whole Milk", calories: 250, protein_g: 8, carbs_g: 38, fats_g: 6 },
        { meal_type: "Snack", recipe_name: "Baked Sweet Potato Wedges (Very Soft)", calories: 130, protein_g: 2, carbs_g: 28, fats_g: 1 },
        { meal_type: "Lunch", recipe_name: "Flaked Salmon Porridge with Spinach", calories: 310, protein_g: 18, carbs_g: 32, fats_g: 11 },
        { meal_type: "Dinner", recipe_name: "Soft Lamb Meatballs with Carrots & Steamed Rice", calories: 310, protein_g: 19, carbs_g: 30, fats_g: 11 }
      ],
      "Sunday": [
        { meal_type: "Breakfast", recipe_name: "Scrambled Eggs with Steamed Spinach Bites", calories: 240, protein_g: 11, carbs_g: 15, fats_g: 14 },
        { meal_type: "Snack", recipe_name: "Yogurt with Soft Peach Mash", calories: 130, protein_g: 6, carbs_g: 17, fats_g: 4 },
        { meal_type: "Lunch", recipe_name: "Chicken Avocado Mash with Soft Bread Points", calories: 320, protein_g: 18, carbs_g: 28, fats_g: 14 },
        { meal_type: "Dinner", recipe_name: "Turkey and Pumpkin Stew with Soft Rice", calories: 310, protein_g: 20, carbs_g: 32, fats_g: 10 }
      ]
    }
  },
  {
    id: "default-preschooler-weekly",
    name: "Preschooler Balanced Plan (3-5 years)",
    description: "Perfectly proportioned balanced weekly schedule tailored for children aged 3-5 years (~1300 kcal/day). Structured meals with healthy grains and moderate protein.",
    target_age: "3-5 years",
    days: {
      "Monday": [
        { meal_type: "Breakfast", recipe_name: "Whole Wheat Pancakes with Strawberries & Whole Milk", calories: 320, protein_g: 10, carbs_g: 50, fats_g: 8 },
        { meal_type: "Snack", recipe_name: "Apple Slices with Soft Almond Butter", calories: 160, protein_g: 4, carbs_g: 22, fats_g: 8 },
        { meal_type: "Lunch", recipe_name: "Grilled Chicken Breast with Brown Rice & Steamed Broccoli", calories: 410, protein_g: 28, carbs_g: 45, fats_g: 12 },
        { meal_type: "Dinner", recipe_name: "Baked Salmon with Quinoa & Steamed Green Beans", calories: 410, protein_g: 26, carbs_g: 40, fats_g: 14 }
      ],
      "Tuesday": [
        { meal_type: "Breakfast", recipe_name: "Scrambled Eggs (2) with Whole Wheat Toast & Cherry Tomatoes", calories: 330, protein_g: 16, carbs_g: 26, fats_g: 16 },
        { meal_type: "Snack", recipe_name: "Greek Yogurt Parfait with Honey & Blueberries", calories: 180, protein_g: 12, carbs_g: 24, fats_g: 4 },
        { meal_type: "Lunch", recipe_name: "Turkey & Cheddar Cheese Roll-up with Cucumber Slices", calories: 390, protein_g: 24, carbs_g: 28, fats_g: 18 },
        { meal_type: "Dinner", recipe_name: "Lean Beef Meatballs with Whole Grain Pasta & Marinara", calories: 400, protein_g: 26, carbs_g: 48, fats_g: 12 }
      ],
      "Wednesday": [
        { meal_type: "Breakfast", recipe_name: "Oatmeal with Chia Seeds, Banana Slices & Walnuts", calories: 340, protein_g: 9, carbs_g: 52, fats_g: 11 },
        { meal_type: "Snack", recipe_name: "Carrot and Cucumber Sticks with Hummus Dip", calories: 150, protein_g: 4, carbs_g: 18, fats_g: 7 },
        { meal_type: "Lunch", recipe_name: "Tuna Salad Wrap with Shredded Lettuce & Seedless Grapes", calories: 400, protein_g: 25, carbs_g: 38, fats_g: 14 },
        { meal_type: "Dinner", recipe_name: "Pan-Seared Organic Tofu with Jasmine Rice & Stir-Fried Veggies", calories: 410, protein_g: 18, carbs_g: 50, fats_g: 14 }
      ],
      "Thursday": [
        { meal_type: "Breakfast", recipe_name: "French Toast with Fresh Raspberries & Milk", calories: 330, protein_g: 12, carbs_g: 46, fats_g: 10 },
        { meal_type: "Snack", recipe_name: "Cottage Cheese Scoop with Pineapple Chunks", calories: 160, protein_g: 14, carbs_g: 18, fats_g: 4 },
        { meal_type: "Lunch", recipe_name: "Hearty Chicken Noodle Soup with Whole Wheat Crackers", calories: 400, protein_g: 22, carbs_g: 42, fats_g: 13 },
        { meal_type: "Dinner", recipe_name: "Baked Cod Fillet with Roasted Potatoes & Green Peas", calories: 410, protein_g: 26, carbs_g: 44, fats_g: 12 }
      ],
      "Friday": [
        { meal_type: "Breakfast", recipe_name: "Smoothie Bowl (Spinach, Banana, Berries, Almond Milk & Chia)", calories: 320, protein_g: 8, carbs_g: 54, fats_g: 7 },
        { meal_type: "Snack", recipe_name: "Hard-Boiled Egg & Fresh Pear Slices", calories: 150, protein_g: 8, carbs_g: 18, fats_g: 6 },
        { meal_type: "Lunch", recipe_name: "Cheese Quesadilla on Whole Wheat Tortilla with Avocado Mash", calories: 420, protein_g: 16, carbs_g: 36, fats_g: 22 },
        { meal_type: "Dinner", recipe_name: "Turkey Burger on Whole Wheat Bun with Baked Sweet Potato Fries", calories: 410, protein_g: 28, carbs_g: 48, fats_g: 10 }
      ],
      "Saturday": [
        { meal_type: "Breakfast", recipe_name: "Whole Wheat Waffle with Pure Honey & Banana Slices", calories: 330, protein_g: 8, carbs_g: 58, fats_g: 7 },
        { meal_type: "Snack", recipe_name: "Celery Sticks with Smooth Almond Butter", calories: 160, protein_g: 4, carbs_g: 12, fats_g: 11 },
        { meal_type: "Lunch", recipe_name: "Chunky Beef and Barley Stew with a Soft Dinner Roll", calories: 410, protein_g: 26, carbs_g: 44, fats_g: 13 },
        { meal_type: "Dinner", recipe_name: "Grilled Herb Shrimp with Quinoa & Steamed Asparagus", calories: 400, protein_g: 28, carbs_g: 38, fats_g: 12 }
      ],
      "Sunday": [
        { meal_type: "Breakfast", recipe_name: "Scrambled Eggs with Chopped Spinach & Mushrooms, English Muffin", calories: 330, protein_g: 15, carbs_g: 32, fats_g: 14 },
        { meal_type: "Snack", recipe_name: "Orange Segments & a Handful of Raw Almonds", calories: 160, protein_g: 5, carbs_g: 18, fats_g: 9 },
        { meal_type: "Lunch", recipe_name: "Diced Chicken Breast over Mixed Greens with Pita & Olive Oil", calories: 410, protein_g: 28, carbs_g: 34, fats_g: 16 },
        { meal_type: "Dinner", recipe_name: "Lentil Vegetable Soup with Warm Garlic Bread & Roasted Squash", calories: 400, protein_g: 18, carbs_g: 52, fats_g: 12 }
      ]
    }
  },
  {
    id: "default-schooler-weekly",
    name: "Grade-Schooler High Growth Plan (6-9 years)",
    description: "Energy-dense, protein-rich plan designed to support rapid physical growth and high cognitive activity in children aged 6-9 years (~1600 kcal/day).",
    target_age: "6-9 years",
    days: {
      "Monday": [
        { meal_type: "Breakfast", recipe_name: "Greek Yogurt with Honey, Granola & Mixed Berries, Glass of Milk", calories: 400, protein_g: 18, carbs_g: 58, fats_g: 10 },
        { meal_type: "Snack", recipe_name: "Mixed Nuts & Organic Dried Cranberries", calories: 200, protein_g: 6, carbs_g: 22, fats_g: 11 },
        { meal_type: "Lunch", recipe_name: "Whole Wheat Grilled Chicken Wrap with Lettuce, Tomato & Avocado", calories: 480, protein_g: 34, carbs_g: 48, fats_g: 15 },
        { meal_type: "Dinner", recipe_name: "Pan-Roasted Salmon Fillet with Wild Rice & Steamed Asparagus", calories: 520, protein_g: 32, carbs_g: 44, fats_g: 20 }
      ],
      "Tuesday": [
        { meal_type: "Breakfast", recipe_name: "Two Eggs Scrambled, 2 Slices Whole Wheat Toast, Half Avocado & OJ", calories: 410, protein_g: 18, carbs_g: 38, fats_g: 20 },
        { meal_type: "Snack", recipe_name: "Apple Slices with Creamy Peanut Butter", calories: 210, protein_g: 7, carbs_g: 24, fats_g: 12 },
        { meal_type: "Lunch", recipe_name: "Lean Roast Beef Sandwich with Swiss Cheese, Lettuce, Tomato & Pear", calories: 480, protein_g: 28, carbs_g: 52, fats_g: 16 },
        { meal_type: "Dinner", recipe_name: "Grilled Chicken Breast with Baked Sweet Potato & Roasted Broccoli", calories: 500, protein_g: 36, carbs_g: 48, fats_g: 14 }
      ],
      "Wednesday": [
        { meal_type: "Breakfast", recipe_name: "Steel-Cut Oats with Maple Syrup, Walnuts, Chia & Milk", calories: 420, protein_g: 12, carbs_g: 62, fats_g: 14 },
        { meal_type: "Snack", recipe_name: "Bell Pepper Strips and Cucumber slices with Edamame Hummus", calories: 180, protein_g: 6, carbs_g: 20, fats_g: 8 },
        { meal_type: "Lunch", recipe_name: "Mediterranean Turkey Pita Pocket with Feta, Spinach & Tzatziki", calories: 490, protein_g: 26, carbs_g: 50, fats_g: 18 },
        { meal_type: "Dinner", recipe_name: "Stir-Fried Sirloin Beef Strips with Jasmine Rice & Mixed Veggies", calories: 510, protein_g: 32, carbs_g: 52, fats_g: 16 }
      ],
      "Thursday": [
        { meal_type: "Breakfast", recipe_name: "Whole Wheat French Toast with Strawberries & Fresh OJ", calories: 400, protein_g: 14, carbs_g: 58, fats_g: 11 },
        { meal_type: "Snack", recipe_name: "Greek Yogurt with Honey and Raw Pumpkin Seeds", calories: 190, protein_g: 15, carbs_g: 18, fats_g: 6 },
        { meal_type: "Lunch", recipe_name: "Teriyaki Tofu over Quinoa & Roasted Zucchini and Carrots", calories: 490, protein_g: 20, carbs_g: 64, fats_g: 15 },
        { meal_type: "Dinner", recipe_name: "Baked Cod with Herb Butter, Roasted Red Potatoes & Peas", calories: 520, protein_g: 30, carbs_g: 50, fats_g: 18 }
      ],
      "Friday": [
        { meal_type: "Breakfast", recipe_name: "Banana Berry Protein Smoothie & 1 Slice Toast with Peanut Butter", calories: 420, protein_g: 16, carbs_g: 62, fats_g: 12 },
        { meal_type: "Snack", recipe_name: "Two Hard-Boiled Eggs with Baby Carrots & Cherry Tomatoes", calories: 180, protein_g: 13, carbs_g: 8, fats_g: 11 },
        { meal_type: "Lunch", recipe_name: "Chicken Quesadilla on Large Spinach Tortilla with Guacamole", calories: 480, protein_g: 28, carbs_g: 40, fats_g: 22 },
        { meal_type: "Dinner", recipe_name: "Lean Turkey Patty on Whole Wheat Bun with Baked Potato Wedges", calories: 520, protein_g: 35, carbs_g: 55, fats_g: 14 }
      ],
      "Saturday": [
        { meal_type: "Breakfast", recipe_name: "Granola Cereal with Whole Milk & Fresh Fruit", calories: 390, protein_g: 11, carbs_g: 64, fats_g: 10 },
        { meal_type: "Snack", recipe_name: "Pear Slices with a Cheddar Cheese Block", calories: 200, protein_g: 8, carbs_g: 20, fats_g: 10 },
        { meal_type: "Lunch", recipe_name: "Three-Bean Stew with Quinoa & Warm Whole Wheat Dinner Roll", calories: 490, protein_g: 20, carbs_g: 68, fats_g: 12 },
        { meal_type: "Dinner", recipe_name: "Lean Beef Lasagna with Spinach & Side Caesar Salad", calories: 520, protein_g: 34, carbs_g: 48, fats_g: 20 }
      ],
      "Sunday": [
        { meal_type: "Breakfast", recipe_name: "Vegetable Omelet with Feta Cheese and Whole Wheat English Muffin", calories: 410, protein_g: 19, carbs_g: 36, fats_g: 19 },
        { meal_type: "Snack", recipe_name: "Cottage Cheese with Sliced Peaches & Sunflower Seeds", calories: 190, protein_g: 14, carbs_g: 18, fats_g: 7 },
        { meal_type: "Lunch", recipe_name: "Tuna Salad in Whole Wheat Pita with Lettuce & Celery Sticks", calories: 480, protein_g: 30, carbs_g: 42, fats_g: 18 },
        { meal_type: "Dinner", recipe_name: "Hearty Lentil Shepherd's Pie with Mashed Sweet Potato Topping", calories: 520, protein_g: 22, carbs_g: 68, fats_g: 15 }
      ]
    }
  }
];
