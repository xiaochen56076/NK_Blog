---
title: 关于SpringBoot中拦截器和过滤器的关系
slug: sb-if
published: 2026-10-05
updated: 2026-10-05
description: ''
image: ''
tags:
  - Fiter
  - Interceptor
  - SpringBoot
category: ''
draft: false
---

# Filter

首先是过滤器（Filter），是Servlet中定义的一个规范，也就是说依赖tomcat等容器，只能在web程序中使用，用来拦截和处理http的请求，过滤器可以对请求进行预处理，也可以对响应进行后处理。过滤器的主要作用是在请求到达Controller之前或响应离开Controller之后，对请求和响应进行处理。

#### 使用方法

首先导入servlet库，因为需要我们来实现当前这个接口，会重写3个主要方法，

示例代码如下

```plain
import javax.servlet.*;
import java.io.IOException;
public class MyFilter implements Filter {
   @Override
   public void init(FilterConfig filterConfig) throws ServletException {
       System.out.println("MyFilter初始化");
   }
   @Override
   public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException {
       System.out.println("MyFilter拦截请求");
       chain.doFilter(request, response); // 继续执行后续过滤器或Controller方法
       System.out.println("MyFilter处理响应");
   }
   @Override
   public void destroy() {
       System.out.println("MyFilter销毁");
   }
}
```

# Interceptor

拦截器是Spring中的一个组件，有spring容器来管理，不用依赖tomcat，用于拦截和处理HTTP请求。拦截器可以对请求进行预处理，也可以对响应进行后处理。拦截器的主要作用是在请求到达Controller之前或响应离开Controller之后，对请求和响应进行处理。

#### 使用方法

这次是实现

示例代码如下

```plain
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
public class MyInterceptor implements HandlerInterceptor {
   @Override
   public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
       System.out.println("MyInterceptor拦截请求");
       return true; // 返回true表示放行，返回false表示拦截请求并终止后续处理流程
   }
   @Override
   public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler, ModelAndView modelAndView) throws Exception {
       System.out.println("MyInterceptor处理响应");
   }
}
```
