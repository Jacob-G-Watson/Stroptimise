import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import type { User } from "../types/api";

interface Props {
	user: User | null;
}

function ProtectedRoute({ user }: Props) {
	if (!user) return <Navigate to="/" replace />;
	return <Outlet />;
}

export default ProtectedRoute;
