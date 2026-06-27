import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { firstAccessiblePath } from "@/lib/permissions";
import LogoutButton from "@/components/LogoutButton";

// The site root is a pure router: it sends users straight to where they belong
// instead of showing a dead-end landing page.
export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const destination = firstAccessiblePath(session.user.permissions);
  if (destination) {
    redirect(destination);
  }

  // Authenticated but no permissions on any page.
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold mb-2">No access yet</h1>
        <p className="text-gray-600 mb-6">
          Your account doesn&apos;t have access to any pages. Please contact an
          administrator to be assigned a role.
        </p>
        <LogoutButton />
      </div>
    </div>
  );
}
