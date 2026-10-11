<!--
Golden Kit
Copyright (C) 2026 Example Creator. Licensed under GPL-3.0-or-later. Made with Agentprise, free software under the GNU GPL v3.0 or later: https://github.com/DepressionCenter/agentprise
-->

# Set up Golden Kit

This download uses tools. Follow the steps that apply to you.

## Turn on the Example Records connector

This works best with the Example Records connector turned on.

In Microsoft 365, ask your admin whether a Example Records connector is available for Copilot.

Without it, the assistant still does the work it can and says that no tool was used.

## Register the sign-in for Pinned tools server

This action needs a sign-in or key that your Microsoft 365 admin registers, for example in the Teams Developer Portal. Ask them to register it, then open plugin-pinned.json inside the app package and replace replace-with-your-auth-registration-id with the id they give you.

## Allow custom apps in Microsoft 365

The app package includes actions, so your organization must allow uploading custom apps. A Teams administrator turns this on in the Teams admin center, under Teams apps, then Setup policies, with Upload custom apps.
