import { currentUser } from "@clerk/nextjs/server";
import dbConnect from "./db";
import User from "@/models/User";

export const checkUser = async () => {
  const user = await currentUser();

  if (!user) return null;

  try {
    await dbConnect();

    const loggedInUser = await User.findOne({
      clerkUserId: user.id,
    });

    if (loggedInUser) {
      return loggedInUser;
    }

    const name = `${user.firstName} ${user.lastName}`;

    const newUser = await User.create({
      clerkUserId: user.id,
      name,
      imageUrl: user.imageUrl,
      email: user.emailAddresses[0].emailAddress,
    });

    return newUser;
  } catch (error) {
    console.log("Error in CheckUser: ", error.message);
  }
};
