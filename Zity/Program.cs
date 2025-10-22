using Microsoft.EntityFrameworkCore;
using Zity.Data;

var builder = WebApplication.CreateBuilder(args);

// EF Core con tu cadena de conexi�n
builder.Services.AddDbContext<ZityContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("ZityConnection")));

// MVC
builder.Services.AddControllersWithViews();

// Sesi�n (memoria + opciones)
builder.Services.AddDistributedMemoryCache(); // Requerido por la sesi�n
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(20);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
});

// HttpContextAccessor (lo estabas registrando, se mantiene)
builder.Services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();

var app = builder.Build();

// Pipeline HTTP (id�ntico a tu intenci�n)
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseSession();
app.UseAuthorization();

app.MapControllerRoute(
    name: "areas",
    pattern: "{area:exists}/{controller=Home}/{action=Index}/{id?}");

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Account}/{action=Login}/{id?}");

app.Run();
