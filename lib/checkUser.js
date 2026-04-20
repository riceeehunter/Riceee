import { currentUser } from "@clerk/nextjs/server";
import { db } from "./prisma";

const isUserIdentityUnavailable = (error) => {
  if (!error) return false;
  const message = String(error?.message || "");
  return error?.code === "P2021" || error?.code === "P2022" || /UserIdentity/i.test(message);
};

export const checkUser = async () => {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  try {
    let identityModelAvailable = true;
    let identity = null;

    try {
      identity = await db.userIdentity.findUnique({
        where: {
          clerkUserId: user.id,
        },
        include: {
          user: true,
        },
      });
    } catch (error) {
      if (isUserIdentityUnavailable(error)) {
        identityModelAvailable = false;
      } else {
        throw error;
      }
    }

    if (identity?.user) {
      return identity.user;
    }

    const loggedInUser = await db.user.findUnique({
      where: {
        clerkUserId: user.id,
      },
    });

    if (loggedInUser) {
      if (identityModelAvailable) {
        try {
          await db.userIdentity.upsert({
            where: { clerkUserId: user.id },
            create: {
              clerkUserId: user.id,
              userId: loggedInUser.id,
            },
            update: {},
          });
        } catch (error) {
          if (!isUserIdentityUnavailable(error)) {
            throw error;
          }
        }
      }
      return loggedInUser;
    }

    const name = `${user.firstName} ${user.lastName}`;

    const createData = {
      clerkUserId: user.id,
      name,
      imageUrl: user.imageUrl,
      email: user.emailAddresses[0].emailAddress,
    };

    if (identityModelAvailable) {
      createData.identities = {
        create: {
          clerkUserId: user.id,
        },
      };
    }

    const newUser = await db.user.create({
      data: createData,
    });

    return newUser;
  } catch (error) {
    console.log(error.message);
  }
};
