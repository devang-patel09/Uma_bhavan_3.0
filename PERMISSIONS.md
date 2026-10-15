# Permissions

## Current role
Only `SUPER_ADMIN` is active in the first release.

| Action | Super Admin |
|---|---|
| Dashboard | Allow |
| Firms CRUD | Allow |
| Members CRUD | Allow |
| Member Migration | Allow |
| Areas CRUD | Allow |
| Surnames CRUD | Allow |
| Niyari | Allow |
| Receipts | Allow |
| Receipt delete | Allow |
| Collections | Allow |
| Reports | Allow |
| Excel import/export | Allow |
| Backup | Allow |
| Restore | Allow |
| User management | Allow |
| Audit history | Allow |
| Settings | Allow |

## Future roles
The authorization layer should use a central `can(user, action, resource)` style function so future roles can be introduced without scattering role checks throughout routes.

Server authorization is the source of truth. Frontend visibility is only a usability layer.
