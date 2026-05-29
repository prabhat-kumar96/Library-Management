import ErrorHandeler from "../middlewares/errorMiddlewares.js";
import { catchAsyncErrors } from "../middlewares/catchAsyncErrors.js";
import { User } from "../models/userModel.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendVerificationCode } from "../utils/sendVerificationCode.js";
import { sendToken } from "../utils/sendToken.js";
import { sendEmail } from "../utils/sendEmail.js";
import { generateForgotPasswordEmailTemplate } from "../utils/emailTemplates.js";
import { getSystemErrorMap } from "util";



export const register = catchAsyncErrors(async(req,res , next ) => {
    try {
        const {name ,email, password, favorite_genres} = req.body;
        if(!name || !email || !password){
            return next(new ErrorHandeler("Please enter all fields.", 400));
        }
        const isRegistered = await User.findOne({email, accountVerified: true});
        if (isRegistered){
            return next(new ErrorHandeler("User already exists.",400));
        }

        const registerationAttemptsByUser = await User.find({
            email,
            accountVerified: false,
        });
        if(registerationAttemptsByUser.length >= 5){
            return next(
                new ErrorHandeler(
                    "You have exceeded the number of registration attempts. Please contact support.."
                    ,400
                )
            );
        }
        if(password.length < 8 || password.length > 16){
            return next(
                new ErrorHandeler("Password must be between 8 and 16 characters.",400)
            )   
        }
        const hashedPassword = await bcrypt.hash(password , 10);
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            favorite_genres: favorite_genres || []
        })
        const verificationCode = await user.generateVerificationCode();
        await user.save();
        sendVerificationCode(verificationCode, email , res);
    } catch (error) {
        next(error)
    }
});

export const verifyOTP = catchAsyncErrors(async(req,res,next) => {
    const {email, otp} = req.body;
    if(!email || !otp){
            return next(new ErrorHandeler("Please enter all fields.",400));
     }
    try {
        const userAllEntries = await User.find({
            email,
            accountVerified: false,
        }).sort({ createdAt: -1});

        if(!userAllEntries || userAllEntries.length === 0){
            return next (new ErrorHandeler("No registration attemptd found for this email.", 404));
        }
        let user;
        if(userAllEntries.length > 1){
            user = userAllEntries[0];
            await User.deleteMany({
               _id: { $ne: user._id},
               accountVerified: false,
               email,
            });
        } else {
            user = userAllEntries[0];
        }
        if(user.verificationCode != Number(otp)){
            return next(new ErrorHandeler("Invalid OTP. Please try again.", 400));
        }
        const currentTime = Date.now();

        const verificationCodeExpire = new Date(user.verificationCodeExpire).getTime();
        if(currentTime > verificationCodeExpire){
            return next(new ErrorHandeler("OTP has expired. Please request a new one.", 400));
        }
        user.accountVerified = true;
        user.verificationCode = null;
        user.verificationCodeExpire = null;
        await user.save({ validateModifiedOnly: true});


        sendToken(user, 200 , "Account verified successfully.", res);
        
    } catch (error) {
        return next(new ErrorHandeler("Internal Server Error", 500));
    }
});

export const login = catchAsyncErrors(async(req, res, next) => {
    const {email , password} = req.body;
    if(! email || ! password){
        return next(new ErrorHandeler("Pleaseenter all fields." , 400))
    }
const user = await User.findOne({ email , accountVerified: true }).select("+password");

    if(!user){
        return next(new ErrorHandeler("Invalid credentials." , 400));
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password);
    if(!isPasswordMatched){
        return next(new ErrorHandeler("Invalid Password!, Try Again." , 400));
    }

    sendToken(user, 200 , "User login successfully." , res);
});

export const logout = catchAsyncErrors(async(req,res,next)=>{
    res.status(200).cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: true,
    }).json({
        success: true,
        message: "Logged out successfully.",
    });
});

export const getUser = catchAsyncErrors(async(req, res , next) => {
    const user = req.user;
    res.status(200).json({
        success: true,
        user,
    })
});

export const forgotPassword = catchAsyncErrors(async(req, res , next) => {
    if(!req.body.email){
        return next(new ErrorHandeler("Please enter your email addfress.", 400));
    }
    const user = await User.findOne({
        email: req.body.email,
        accountVerified: true,
    });
    if(!user){
        return next(new ErrorHandeler("User not found with this email.", 404));
    }

    const resetToken = user.getResetPasswordToken();

    await user.save({ validateModifiedOnly: true});

   const resetPasswordUrl = `${process.env.FRONTEND_URL}/password/reset/${resetToken}`;

    const message = generateForgotPasswordEmailTemplate(resetPasswordUrl);

    try {
        await sendEmail({
            email: user.email,
            subject: "Library Management System Password Reset Request",
            message,
        });
        res.status(200).json({
            success: true,
            message: `Email sent to ${user.email} with password reset instructions.`,
        })
    } catch (error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save({ validateBeforeSave: false});
        return next(new ErrorHandeler(error.message, 500));
    }
});

export const resetPassword = catchAsyncErrors(async(req , res , next) => {
    const {token} = req.params;
    const resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

   const user = await User.findOne({
        resetPasswordToken,
        resetPasswordTokenExpire: { $gt: Date.now()},
    });
    if(!user){
        return next(new ErrorHandeler("Reset password token is invalid or expired.", 400));
    }
    if(req.body.password !== req.body.confirmPassword){
        return next(new ErrorHandeler("Password do not match.", 400));
    }
    if(req.body.password.length < 8 || req.body.password.length > 16){
        return next(new ErrorHandeler("Password must be between 8 and 16 characters.", 400));
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save({ validateModifiedOnly: true});

    sendToken(user , 200 , "Password reset successfully", res);
});

export const updatePassword = catchAsyncErrors(async(req, res, next) => {
     const user = await User.findById(req.user._id).select("+password");
        const { currentPassword , newPassword , confirmNewPassword} = req.body;
        if(!currentPassword || !newPassword || !confirmNewPassword){
            return next(new ErrorHandeler("Please enter all fields.", 400));
        }
        const isPasswordMatched = await bcrypt.compare(currentPassword , user.password);
        if(!isPasswordMatched){
            return next(new ErrorHandeler("Current password is incorrect.", 400));
        }
        if(newPassword.length < 8 
            ||newPassword.length > 16){
            return next(new ErrorHandeler("Password must be between 8 and 16 characters.",400));
        }
        if(newPassword !== confirmNewPassword){
            return next(new ErrorHandeler("New password and confirm password do not match.", 400));
        }

        const hashedPassword = await bcrypt.hash(newPassword , 10);
        user.password = hashedPassword;
        await user.save({ validateModifiedOnly: true });

        res.status(200).json({
            success: true,
            message: "Password updated successfully.",
        })
});