# syntax=docker/dockerfile:1

# Set the Node.js version to use in the base image.
ARG NODE_VERSION=20.12.1

# Use node image for base stage.
FROM node:${NODE_VERSION}-alpine as base

# Set working directory for all stages.
WORKDIR /usr/src/app

################################################################################
# Stage for installing production dependencies.
FROM base as deps

# Copy package.json and package-lock.json to leverage Docker's caching.
COPY package.json package-lock.json ./

# Install production dependencies using npm ci.
RUN npm ci --omit=dev

################################################################################
# Stage for building the application.
FROM base as build

# Copy package.json and package-lock.json first for caching.
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies).
RUN npm ci

# Copy all source files from the project into the container.
COPY . .

# Build the Next.js app.
RUN npm run build

################################################################################
# Final stage for running the application.
FROM base as final

# Set the environment to production.
ENV NODE_ENV production

# Create a non-root user to run the app for better security.
USER node

# Copy package.json to be able to run npm commands.
COPY package.json ./

# Copy production dependencies from the deps stage.
COPY --from=deps /usr/src/app/node_modules ./node_modules

# Copy the built application from the build stage.
COPY --from=build /usr/src/app/public ./public
COPY --from=build /usr/src/app/.next ./.next
COPY --from=build /usr/src/app/next.config.mjs ./next.config.mjs

# Expose the port the application runs on.
EXPOSE 3100

# Run the application.
CMD ["npm", "start"]
