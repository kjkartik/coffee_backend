const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const Image = require("../../models/upload_image_model");
const Coffee = require("../../models/uploadCoffee/upload_coffee_details_model");
const { sendFail, sendError, sendSuccess } = require("../../utils");

// Multer Configuration
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const isValid = allowedTypes.test(file.mimetype);

  if (isValid) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type! Only images are allowed."));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter,
}).single("image");

async function uploadItem(req, res) {
  try {
    const { coffeeType, coffeeName, coffeeNature, details, price, } = req.body;


    switch (true) {
      case !coffeeType:
        return sendFail(res, 400, "The coffeeType field is required.");
      case !coffeeName:
        return sendFail(res, 400, "The coffeeName field is required.");
      case !coffeeNature:
        return sendFail(res, 400, "The coffeeNature field is required.");
      case !details:
        return sendFail(res, 400, "The details field is required.");
      case !price:
        return sendFail(res, 400, "The price field is required.");
      case !req.file:
        return sendFail(res, 400, "The image file is required.");

    }


    // Parse and validate price
    const parsedPrice = JSON.parse(price);
    if (
      !parsedPrice.large ||
      !parsedPrice.medium ||
      !parsedPrice.small ||
      typeof parsedPrice.large !== "number" ||
      typeof parsedPrice.medium !== "number" ||
      typeof parsedPrice.small !== "number"
    ) {
      return handleValidationError("INVALID_OR_MISSING_PRICE", res);
    }

    // Convert image buffer to Base64 and save image
    const imageBase64 = req.file.buffer.toString("base64");
    const imageId = uuidv4();
    const newImage = new Image({
      imageId,
      imageBase64,
      contentType: req.file.mimetype,
    });
    await newImage.save();

    // Save coffee details
    const newCoffee = new Coffee({
      imageId,
      coffeeType,
      coffeeName,
      coffeeNature,
      details,
      price: parsedPrice,
    });
    await newCoffee.save();

    return sendSuccess(res, 201, "Details uploaded successfully.", newCoffee);
  } catch (error) {
    console.error("Error uploading item:", error);
    return sendError(res, error);
  }
}

// Validation Error Handling
function handleValidationError(field, res) {
  switch (field) {
    case "INVALID_OR_MISSING_PRICE":
      return sendFail(res, 400, "Invalid or missing price. Ensure 'large', 'medium', and 'small' are numeric.");
    default:
      return sendFail(res, 400, "Unknown validation error.");
  }
}




// Get Items Details
async function getItemsDetails(req, res) {
  try {
    const data = await Coffee.find();
    if (!data || data.length === 0) {
      return sendFail(res, 404, "No data found.");
    }
    return sendSuccess(res, 200, "Details fetched successfully.", data);
  } catch (error) {
    console.error("Error fetching items:", error);
    return sendError(res, error);
  }
}

// Delete Item
async function deleteItems(req, res) {
  try {
    const { id } = req.params;

    if (!id) {
      return sendFail(res, 400, "ID is required to delete an item.");
    }

    const coffee = await Coffee.findById(id);
    if (!coffee) {
      return sendFail(res, 404, "Item not found.");
    }

    // Delete associated image
    await Image.deleteOne({ imageId: coffee.imageId });

    // Delete coffee item
    await Coffee.findByIdAndDelete(id);

    return sendSuccess(res, 200, "Item deleted successfully.", coffee);
  } catch (error) {
    console.error("Error deleting item:", error);
    return sendError(res, error);
  }
}

module.exports = { uploadItem, upload, getItemsDetails, deleteItems };
