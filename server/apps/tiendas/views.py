"""
Vistas del módulo de Tiendas.
Sprint 0: Crear y listar tiendas del usuario autenticado.
"""

from rest_framework import exceptions, generics, permissions, status
from rest_framework.response import Response

from .models import Producto, Tienda
from .serializers import ProductoSerializer, TiendaSerializer


class IsEmpresaUser(permissions.BasePermission):
    message = "Solo los usuarios con rol 'empresa' pueden administrar productos."

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and request.user.rol
            and request.user.rol.nombre == 'empresa'
        )


class IsEmpresaUser(permissions.BasePermission):
    """Permiso que permite acceso únicamente a usuarios con rol 'empresa'."""
    message = "Solo los usuarios con rol 'empresa' pueden crear o administrar tiendas."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.rol
            and request.user.rol.nombre == 'empresa'
        )


class TiendaListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/tiendas/ — Listar tiendas del usuario autenticado (solo rol empresa).
    POST /api/tiendas/ — Crear nueva tienda (asociada al usuario como propietario).
    """
    serializer_class = TiendaSerializer
    permission_classes = [permissions.IsAuthenticated, IsEmpresaUser]

    def get_queryset(self):
        return Tienda.objects.filter(propietario=self.request.user)

    def perform_create(self, serializer):
        serializer.save(propietario=self.request.user)


class ProductoListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductoSerializer
    permission_classes = [permissions.IsAuthenticated, IsEmpresaUser]

    def get_queryset(self):
        return Producto.objects.filter(tienda__propietario=self.request.user, activo=True)

    def perform_create(self, serializer):
        tienda = serializer.validated_data['tienda']
        if tienda.propietario != self.request.user:
            raise exceptions.PermissionDenied('No tienes permisos para esta tienda.')
        serializer.save()


class ProductoDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductoSerializer
    permission_classes = [permissions.IsAuthenticated, IsEmpresaUser]

    def get_queryset(self):
        return Producto.objects.filter(tienda__propietario=self.request.user, activo=True)

    def perform_destroy(self, instance):
        instance.activo = False
        instance.save(update_fields=['activo'])

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response({'message': 'Producto eliminado correctamente.'}, status=status.HTTP_200_OK)
