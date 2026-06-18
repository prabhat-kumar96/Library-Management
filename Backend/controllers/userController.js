import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import { User } from "../models/userModel.js";
import ErrorHandeler from "../middlewares/errorMiddlewares.js";
import cloudinary from "cloudinary";
import bcrypt from "bcrypt";

export const getAllUsers = catchAsyncErrors(async(req , res , next) => {
    const users = await User.find({ accountVerified: true});
    res.status(200).json({
        success: true,
        users,
        message: "Users fetched successfully."
    });
});

export const registerNewAdmin = catchAsyncErrors(async(req , res , next) =>{
    if(!req.files || Object.keys(req.files).length === 0) {
        return next(new ErrorHandeler("Admin avatar is required", 400));
    }

    const {name , email , password} = req.body;
    if(!name || !email || !password) {
        return next(new ErrorHandeler("Please provide all required fields" , 400));
    }

    const isRegistered = await User.findOne({ email , accountVerified: true});
    if(isRegistered) {
        return next(new ErrorHandeler("User already registered." , 400));
    }
    if(password.length < 8 || password.length > 16) {
        return next(new ErrorHandeler("Password must be between 8 and 16 characters long", 400));
    }
    if (!/[A-Z]/.test(password)) {
        return next(new ErrorHandeler("invalid password must contain atleast oneUppercase", 400));
    }
    if (!/[a-z]/.test(password)) {
        return next(new ErrorHandeler("invalid password must contain atleast oneLowercase", 400));
    }
    if (!/[\W_]/.test(password)) {
        return next(new ErrorHandeler("invalid password must contain atleast oneSpecialCharacter", 400));
    }

    const {avatar} = req.files;
    const allowedFormats = ["image/jpeg", "image/jpg", "image/png"];
    if(!allowedFormats.includes(avatar.mimetype)){
        return next(new ErrorHandeler("Invalid image format. Allowed format are jpeg , jpg , png", 400));
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const cloudinaryResponse = await cloudinary.uploader.upload(
        avatar.tempFilePath, {
            folder: "LIBRARY_MANAGEMENT_SYSTEM_ADMIN_AVATARS"
        }
    );
    if(!cloudinaryResponse || cloudinaryResponse.error) {
        console.error("Cloudinary error:" , 
            cloudinaryResponse.error || "Unknown cloudinary error.");

        return next(new ErrorHandeler("Failed to upload avatar to cloudinary", 500));
    } 

    const admin = await User.create({
        name,
        email,
        password: hashedPassword,
        role: "Admin",
        accountVerified: true,

        avatar: {
            public_id: cloudinaryResponse.public_id,
            url: cloudinaryResponse.secure_url
        },
    });
    res.status(201).json({
        success: true,
        admin,
        message: "Admin registered successfully.",
    });
});

export const settleUserDues = catchAsyncErrors(async (req, res, next) => {
    const { amountPaid, fineAdded } = req.body;
    const user = await User.findById(req.params.id);
    
    if (!user) return next(new ErrorHandeler("User not found.", 404));

    let currentDue = user.totalFinesDue || 0;
    
    // Add new fine (if book was returned late)
    currentDue += Number(fineAdded || 0); 
    // Subtract what they paid at the desk
    currentDue -= Number(amountPaid || 0); 

    // Prevent negative balances
    if (currentDue < 0) currentDue = 0; 
    
    user.totalFinesDue = currentDue;
    await user.save();

    res.status(200).json({
        success: true,
        message: "Payment & Dues updated successfully.",
    });
});

export const updateProfile = catchAsyncErrors(async (req, res, next) => {
    const newData = { name: req.body.name };

    if (req.files && req.files.avatar) {
        const file = req.files.avatar;
        // Logic to upload new avatar to Cloudinary...
        // const results = await cloudinary.v2.uploader.upload(file.tempFilePath);
        // newData.avatar = { public_id: results.public_id, url: results.secure_url };
    }

    const user = await User.findByIdAndUpdate(req.user.id, newData, { new: true });
    res.status(200).json({ success: true, user, message: "Profile updated!" });
});



